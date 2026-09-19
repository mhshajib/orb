<script setup lang="ts">
import type { User, UserRole, UserStatus } from '@/composables/useUsers'

useHead({ title: 'Team' })

const { user } = useAuth()
const { success, error: toastError, confirm } = useToast()
const orgState = useOrg()
const { plans } = usePlans()

const myRole = computed<UserRole | undefined>(() => user.value?.role)
const myId = computed(() => user.value?.user_id)

if (!orgState.value) await fetchOrg()

type Filter = 'all' | UserStatus
const filter = ref<Filter>('all')
const page = ref(1)
const perPage = 20

const { data, pending, error, refresh } = await useAsyncData(
  'team-users',
  () => listUsers({ limit: perPage, offset: (page.value - 1) * perPage }),
  { watch: [page] },
)

// Human team view excludes service (api_user) accounts.
const humanUsers = computed<User[]>(() => (data.value?.items ?? []).filter(u => u.role !== 'api_user'))

const filtered = computed<User[]>(() => humanUsers.value.filter((u) => {
  if (filter.value !== 'all' && u.status !== filter.value) return false
  return true
}))

// Org's verified sending domains — a new user's mailbox lives on one of these.
const { data: domainsData } = await useAsyncData('team-domains', () => listDomains())
const verifiedDomains = computed(() => (domainsData.value ?? []).filter(d => d.status === 'verified'))
const hasVerifiedDomain = computed(() => verifiedDomains.value.length > 0)

// ---------- Role hierarchy (ported from legacy) ----------
// Can `myRole` perform a manage-action on `target`?
function canManage(target: User): boolean {
  if (!myRole.value) return false
  if (target.id === myId.value) return false
  if (target.role === 'api_user') return false
  if (myRole.value === 'owner') return target.role === 'admin' || target.role === 'member'
  if (myRole.value === 'admin') return target.role === 'member'
  return false
}

const canInvite = computed(() => myRole.value === 'owner' || myRole.value === 'admin')
const invitableRoles = computed<('admin' | 'member')[]>(() => {
  if (myRole.value === 'owner') return ['admin', 'member']
  if (myRole.value === 'admin') return ['member']
  return []
})

// ---------- Plan user-limit usage ----------
const currentPlanKey = computed(() => orgState.value?.plan ?? 'free')
const userLimit = computed<number | null>(() => plans.value[currentPlanKey.value]?.users ?? null)
const userCount = computed(() => data.value?.meta.total ?? humanUsers.value.length)
const atUserLimit = computed(() => userLimit.value != null && userCount.value >= userLimit.value)
const activeCount = computed(() => humanUsers.value.filter(u => u.status === 'active').length)
const invitedCount = computed(() => humanUsers.value.filter(u => u.status === 'invited').length)
const usagePct = computed(() => {
  if (userLimit.value == null || userLimit.value === 0) return userCount.value > 0 ? 100 : 0
  return Math.min(100, Math.round((userCount.value / userLimit.value) * 100))
})

// ---------- Invite dialog (email + role) ----------
const inviteOpen = ref(false)
const inviteEmail = ref('')
const inviteRole = ref<'admin' | 'member'>('member')
const inviting = ref(false)
const inviteError = ref('')

function openInvite() {
  if (!canInvite.value) return
  inviteEmail.value = ''
  inviteRole.value = invitableRoles.value[0] ?? 'member'
  inviteError.value = ''
  inviteOpen.value = true
}

async function submitInvite() {
  if (inviting.value) return
  inviteError.value = ''
  const email = inviteEmail.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    inviteError.value = 'Enter a valid email address.'
    return
  }
  inviting.value = true
  try {
    await inviteUser({ email, role: inviteRole.value })
    inviteOpen.value = false
    success(`Invitation sent to ${email}.`)
    await refresh()
  }
  catch (e) {
    inviteError.value = errMsg(e, 'Could not invite user')
  }
  finally {
    inviting.value = false
  }
}

// ---------- Create user dialog (direct, with password) ----------
// Owner chooses which verified domain the mailbox sits on; an admin gets the
// org's domain auto-selected (no choice). The creator sets an initial password
// and shares it — the new user can change it later.
const createOpen = ref(false)
const cUsername = ref('')
const cDomain = ref('')
const cName = ref('')
const cRole = ref<'admin' | 'member'>('member')
const cPassword = ref('')
const cConfirm = ref('')
const creating = ref(false)
const createError = ref('')

const canChooseDomain = computed(() => myRole.value === 'owner')
const usernameRe = /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?$/i
const cEmail = computed(() => {
  const u = cUsername.value.trim().toLowerCase()
  return u && cDomain.value ? `${u}@${cDomain.value}` : ''
})

// Live availability check, debounced.
const checkingEmail = ref(false)
const emailAvailable = ref<boolean | null>(null)
const emailCheckError = ref('')
let emailDebounce: ReturnType<typeof setTimeout> | null = null

watch([cUsername, cDomain], () => {
  emailAvailable.value = null
  emailCheckError.value = ''
  if (emailDebounce) clearTimeout(emailDebounce)
  const u = cUsername.value.trim()
  if (!u || !cDomain.value) return
  if (!usernameRe.test(u)) {
    emailCheckError.value = 'Use letters, numbers, and . _ + - only.'
    return
  }
  const email = cEmail.value
  checkingEmail.value = true
  emailDebounce = setTimeout(async () => {
    try {
      emailAvailable.value = await checkUserEmail(email)
    }
    catch (e) {
      emailAvailable.value = null
      emailCheckError.value = errMsg(e, 'Could not check availability')
    }
    finally {
      checkingEmail.value = false
    }
  }, 400)
})

function openCreate() {
  if (!canInvite.value) return
  if (!hasVerifiedDomain.value) {
    toastError('Add and verify a sending domain before creating users.')
    return
  }
  cUsername.value = ''
  cDomain.value = verifiedDomains.value[0]?.domain ?? ''
  cName.value = ''
  cRole.value = invitableRoles.value[0] ?? 'member'
  cPassword.value = ''
  cConfirm.value = ''
  createError.value = ''
  emailAvailable.value = null
  emailCheckError.value = ''
  createOpen.value = true
}

async function submitCreate() {
  if (creating.value) return
  createError.value = ''
  const u = cUsername.value.trim()
  if (!u || !usernameRe.test(u)) {
    createError.value = 'Enter a valid username.'
    return
  }
  if (!cEmail.value) {
    createError.value = 'Pick a domain for the mailbox.'
    return
  }
  if (emailAvailable.value === false) {
    createError.value = 'That address is already taken.'
    return
  }
  if (cPassword.value.length < 8) {
    createError.value = 'Password must be at least 8 characters.'
    return
  }
  if (cPassword.value !== cConfirm.value) {
    createError.value = 'Passwords do not match.'
    return
  }
  creating.value = true
  try {
    await createUser({ email: cEmail.value, name: cName.value.trim(), password: cPassword.value, role: cRole.value })
    createOpen.value = false
    success(`${cEmail.value} created.`)
    await refresh()
  }
  catch (e) {
    createError.value = errMsg(e, 'Could not create user')
  }
  finally {
    creating.value = false
  }
}

// ---------- Per-row actions ----------
async function changeRole(target: User, role: UserRole) {
  if (!canManage(target)) return
  try {
    await updateUser(target.id, { role })
    success(`${target.name || target.email} is now ${role}.`)
    await refresh()
  }
  catch (e) {
    toastError(errMsg(e, 'Could not change role'))
  }
}

async function toggleSuspend(target: User) {
  if (!canManage(target)) return
  const suspending = target.status !== 'suspended'
  const who = target.name || target.email
  const ok = await confirm({
    title: suspending ? 'Suspend this user?' : 'Reactivate this user?',
    text: suspending
      ? `${who} will be signed out and blocked from sending until reactivated.`
      : `${who} will regain access to the org.`,
    confirmText: suspending ? 'Suspend' : 'Reactivate',
    danger: suspending,
  })
  if (!ok) return
  const next: UserStatus = suspending ? 'suspended' : 'active'
  try {
    await updateUser(target.id, { status: next })
    success(suspending ? 'User suspended.' : 'User reactivated.')
    await refresh()
  }
  catch (e) {
    toastError(errMsg(e, 'Could not update status'))
  }
}

// ---------- Set password (direct, no email) ----------
const pwOpen = ref(false)
const pwTarget = ref<User | null>(null)
const pwNew = ref('')
const pwConfirm = ref('')
const pwSaving = ref(false)
const pwError = ref('')

function openSetPassword(target: User) {
  if (!canManage(target)) return
  pwTarget.value = target
  pwNew.value = ''
  pwConfirm.value = ''
  pwError.value = ''
  pwOpen.value = true
}

async function submitSetPassword() {
  if (pwSaving.value || !pwTarget.value) return
  pwError.value = ''
  if (pwNew.value.length < 8) {
    pwError.value = 'Password must be at least 8 characters.'
    return
  }
  if (pwNew.value !== pwConfirm.value) {
    pwError.value = 'Passwords do not match.'
    return
  }
  pwSaving.value = true
  try {
    await setUserPassword(pwTarget.value.id, pwNew.value)
    success(`Password updated for ${pwTarget.value.name || pwTarget.value.email}.`)
    pwOpen.value = false
  }
  catch (e) {
    pwError.value = errMsg(e, 'Could not set password')
  }
  finally {
    pwSaving.value = false
  }
}

async function reset2FAFor(target: User) {
  if (!canManage(target)) return
  const ok = await confirm({
    title: 'Reset 2FA?',
    text: `${target.name || target.email} will need to set up two-factor authentication again.`,
    confirmText: 'Reset 2FA',
  })
  if (!ok) return
  try {
    await resetUser2FA(target.id)
    success(`${target.name || target.email}'s 2FA has been reset.`)
    await refresh()
  }
  catch (e) {
    toastError(errMsg(e, 'Could not reset 2FA'))
  }
}

async function removeUser(target: User) {
  if (!canManage(target)) return
  const ok = await confirm({
    title: 'Remove this user?',
    text: `${target.name || target.email} will lose access immediately. Their email history stays with the org.`,
    confirmText: 'Remove user',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteUserById(target.id)
    success('User removed.')
    await refresh()
  }
  catch (e) {
    toastError(errMsg(e, 'Could not remove user'))
  }
}

// ---------- Display helpers ----------
function initials(u: User): string {
  const base = u.name?.trim() || u.email
  return base.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?'
}

const statusBadge: Record<UserStatus, { cls: string, label: string }> = {
  active: { cls: 'badge-outline-success', label: 'Active' },
  invited: { cls: 'badge-outline-warning', label: 'Invited' },
  pending_verification: { cls: 'badge-outline-warning', label: 'Pending' },
  suspended: { cls: 'badge-outline-danger', label: 'Suspended' },
}
const fallbackBadge = { cls: 'badge-outline-secondary', label: '—' }
function badgeFor(status: UserStatus) {
  return statusBadge[status] ?? fallbackBadge
}

const roleBadge: Record<UserRole, string> = {
  owner: 'badge-outline-primary',
  admin: 'badge-outline-info',
  member: 'badge-outline-secondary',
  api_user: 'badge-outline-dark',
}

const filterTabs: { value: Filter, label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
]

function fmtNumber(n: number) {
  return new Intl.NumberFormat().format(n)
}
</script>

<template>
  <div>
    <ul class="flex space-x-2 rtl:space-x-reverse">
      <li>
        <NuxtLink to="/app" class="text-primary hover:underline">Dashboard</NuxtLink>
      </li>
      <li class="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
        <span>Team</span>
      </li>
    </ul>

    <div class="space-y-6 pt-5">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-semibold dark:text-white-light">Team</h2>
          <p class="mt-1 text-sm text-white-dark">
            Add teammates, manage roles, and reset credentials.
            <span v-if="!canInvite" class="block text-warning">Only owners and admins can manage users.</span>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="btn btn-primary gap-2 shadow-[0_10px_20px_-10px_rgba(67,97,238,0.6)]"
            :disabled="!canInvite || atUserLimit || !hasVerifiedDomain"
            :title="!hasVerifiedDomain ? 'Verify a sending domain first' : ''"
            @click="openCreate"
          >
            <icon-user-plus class="h-5 w-5 shrink-0" />
            Add user
          </button>
          <button type="button" class="btn btn-outline-primary gap-2" :disabled="!canInvite || atUserLimit" @click="openInvite">
            <icon-mail class="h-5 w-5 shrink-0" />
            Invite
          </button>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div class="panel flex items-center gap-4">
          <div class="grid h-12 w-12 shrink-0 place-content-center rounded-xl bg-primary/10 text-primary">
            <icon-users-group class="h-6 w-6" />
          </div>
          <div class="min-w-0">
            <div class="text-xs uppercase tracking-wide text-white-dark">Total members</div>
            <div class="text-2xl font-semibold dark:text-white-light">{{ fmtNumber(userCount) }}</div>
          </div>
        </div>
        <div class="panel flex items-center gap-4">
          <div class="grid h-12 w-12 shrink-0 place-content-center rounded-xl bg-success/10 text-success">
            <icon-checks class="h-6 w-6" />
          </div>
          <div class="min-w-0">
            <div class="text-xs uppercase tracking-wide text-white-dark">Active</div>
            <div class="text-2xl font-semibold dark:text-white-light">{{ fmtNumber(activeCount) }}</div>
          </div>
        </div>
        <div class="panel flex items-center gap-4">
          <div class="grid h-12 w-12 shrink-0 place-content-center rounded-xl bg-warning/10 text-warning">
            <icon-mail class="h-6 w-6" />
          </div>
          <div class="min-w-0">
            <div class="text-xs uppercase tracking-wide text-white-dark">Pending invites</div>
            <div class="text-2xl font-semibold dark:text-white-light">{{ fmtNumber(invitedCount) }}</div>
          </div>
        </div>
        <div class="panel">
          <div class="flex items-center justify-between">
            <div class="text-xs uppercase tracking-wide text-white-dark">Plan usage</div>
            <span class="badge badge-outline-primary capitalize">{{ currentPlanKey }}</span>
          </div>
          <div class="mt-2 text-lg font-semibold dark:text-white-light">
            {{ fmtNumber(userCount) }}
            <span class="text-sm font-normal text-white-dark">
              / {{ userLimit == null ? '∞' : fmtNumber(userLimit) }} seats
            </span>
          </div>
          <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#ebedf2] dark:bg-dark/40">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="atUserLimit ? 'bg-danger' : 'bg-primary'"
              :style="{ width: usagePct + '%' }"
            />
          </div>
          <div v-if="atUserLimit" class="mt-2 text-xs text-warning">
            Limit reached.
            <NuxtLink to="/app/billing" class="font-semibold underline hover:no-underline">Upgrade</NuxtLink>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="flex items-center gap-2 rounded border border-danger/40 bg-danger-light p-4 text-sm text-danger dark:bg-danger-dark-light">
        <icon-info-triangle class="h-5 w-5 shrink-0" />
        {{ errMsg(error, 'Could not load users') }}
      </div>

      <!-- Table panel -->
      <div class="panel overflow-hidden border-0 p-0">
        <!-- Toolbar -->
        <div class="flex flex-col gap-4 border-b border-[#e0e6ed] p-5 dark:border-[#1b2e4b] md:flex-row md:items-center md:justify-between">
          <h5 class="text-lg font-semibold dark:text-white-light">Members</h5>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="t in filterTabs"
              :key="t.value"
              type="button"
              class="btn btn-sm"
              :class="filter === t.value ? 'btn-primary' : 'btn-outline-primary'"
              @click="filter = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="pending && !data" class="flex items-center justify-center gap-2 p-12 text-white-dark">
          <icon-loader class="h-5 w-5 animate-spin" />
          Loading users…
        </div>

        <!-- Empty -->
        <div v-else-if="!filtered.length" class="flex flex-col items-center gap-4 py-16 text-center">
          <div class="grid h-16 w-16 place-content-center rounded-2xl bg-primary/10 text-primary">
            <icon-users-group class="h-8 w-8" />
          </div>
          <div>
            <div class="text-lg font-semibold dark:text-white-light">No users match this filter</div>
            <div class="text-sm text-white-dark">Switch tabs or invite someone to your team.</div>
          </div>
          <button v-if="canInvite && !atUserLimit" type="button" class="btn btn-primary gap-2" @click="openInvite">
            <icon-user-plus class="h-5 w-5" />
            Invite user
          </button>
        </div>

        <!-- Rows -->
        <div v-else class="table-responsive">
          <table class="table-hover whitespace-nowrap">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>2FA</th>
                <th class="ltr:text-right rtl:text-left">Sent</th>
                <th class="!text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in filtered" :key="u.id">
                <td>
                  <div class="flex min-w-0 items-center gap-3">
                    <div class="grid h-10 w-10 shrink-0 place-content-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-white">
                      <img v-if="u.avatar_url" :src="u.avatar_url" :alt="u.name || u.email" class="h-full w-full object-cover">
                      <span v-else>{{ initials(u) }}</span>
                    </div>
                    <div class="min-w-0">
                      <div class="truncate font-semibold text-dark dark:text-white-light">
                        {{ u.name || u.email }}
                        <span v-if="u.id === myId" class="ltr:ml-1 rtl:mr-1 text-xs font-normal text-white-dark">(you)</span>
                      </div>
                      <div class="truncate text-xs text-white-dark">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge capitalize" :class="roleBadge[u.role]">{{ u.role }}</span>
                </td>
                <td>
                  <span class="badge" :class="badgeFor(u.status).cls">{{ badgeFor(u.status).label }}</span>
                </td>
                <td>
                  <span v-if="u.two_fa_enabled" class="inline-flex items-center gap-1 text-success">
                    <icon-lock class="h-4 w-4" /> On
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-white-dark">
                    <icon-lock-dots class="h-4 w-4" /> Off
                  </span>
                </td>
                <td class="font-semibold ltr:text-right rtl:text-left">{{ fmtNumber(u.sent_count) }}</td>
                <td>
                  <div v-if="canManage(u)" class="flex justify-center">
                    <Popper :placement="'bottom-end'" offsetDistance="4" class="align-middle">
                      <button type="button" class="btn btn-outline-primary btn-sm gap-1">
                        Manage
                        <icon-caret-down class="h-4 w-4" />
                      </button>
                      <template #content="{ close }">
                        <ul class="min-w-[12rem] whitespace-nowrap rounded-md border border-[#e0e6ed] bg-white py-1.5 text-sm font-semibold text-dark shadow-lg dark:border-[#1b2e4b] dark:bg-[#1b2e4b] dark:text-white-dark">
                          <template v-if="myRole === 'owner' && u.role !== 'admin'">
                            <li>
                              <button type="button" class="flex w-full items-center gap-2 px-4 py-2 hover:bg-primary/10 hover:text-primary" @click="changeRole(u, 'admin'); close()">
                                <icon-star class="h-4 w-4 shrink-0" /> Make admin
                              </button>
                            </li>
                          </template>
                          <li v-if="u.role !== 'member'">
                            <button type="button" class="flex w-full items-center gap-2 px-4 py-2 hover:bg-primary/10 hover:text-primary" @click="changeRole(u, 'member'); close()">
                              <icon-user class="h-4 w-4 shrink-0" /> Make member
                            </button>
                          </li>
                          <li>
                            <button type="button" class="flex w-full items-center gap-2 px-4 py-2 hover:bg-primary/10 hover:text-primary" @click="toggleSuspend(u); close()">
                              <icon-minus-circle class="h-4 w-4 shrink-0" />
                              {{ u.status === 'suspended' ? 'Reactivate' : 'Suspend' }}
                            </button>
                          </li>
                          <li>
                            <button type="button" class="flex w-full items-center gap-2 px-4 py-2 hover:bg-primary/10 hover:text-primary" @click="openSetPassword(u); close()">
                              <icon-lock class="h-4 w-4 shrink-0" /> Set new password
                            </button>
                          </li>
                          <li v-if="u.two_fa_enabled">
                            <button type="button" class="flex w-full items-center gap-2 px-4 py-2 hover:bg-primary/10 hover:text-primary" @click="reset2FAFor(u); close()">
                              <icon-refresh class="h-4 w-4 shrink-0" /> Reset 2FA
                            </button>
                          </li>
                          <li class="my-1 border-t border-[#e0e6ed] dark:border-white-dark/10" />
                          <li>
                            <button type="button" class="flex w-full items-center gap-2 px-4 py-2 text-danger hover:bg-danger/10" @click="removeUser(u); close()">
                              <icon-x-circle class="h-4 w-4 shrink-0" /> Remove user
                            </button>
                          </li>
                        </ul>
                      </template>
                    </Popper>
                  </div>
                  <div v-else class="text-center text-white-dark">—</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="data && data.meta.pages > 1" class="flex items-center justify-between border-t border-[#e0e6ed] p-4 text-sm text-white-dark dark:border-[#1b2e4b]">
          <div>Page {{ data.meta.page }} of {{ data.meta.pages }} — {{ data.meta.total }} total</div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-outline-primary btn-sm" :disabled="page <= 1" @click="page--">Prev</button>
            <button type="button" class="btn btn-outline-primary btn-sm" :disabled="page >= data.meta.pages" @click="page++">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create user modal -->
    <div v-if="createOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
      <div class="panel w-full max-w-lg overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] px-5 py-3.5 dark:bg-[#121c2c]">
          <h5 class="text-lg font-semibold dark:text-white-light">Add a user</h5>
          <button type="button" class="text-white-dark outline-none hover:text-danger" @click="createOpen = false">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <form class="space-y-5 p-5" @submit.prevent="submitCreate">
          <p class="text-sm text-white-dark">
            Create a mailbox on one of your verified domains and set an initial password. Share it securely — they can change it later.
          </p>

          <!-- Username + domain -->
          <div>
            <label for="create-username" class="mb-1.5 block font-semibold dark:text-white-light">Email address</label>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="create-username"
                v-model="cUsername"
                type="text"
                class="form-input sm:flex-1"
                placeholder="username"
                autocomplete="off"
                spellcheck="false"
                required
              >
              <!-- Owner picks the domain; admin sees it fixed. -->
              <select v-if="canChooseDomain" v-model="cDomain" class="form-select sm:w-56">
                <option v-for="d in verifiedDomains" :key="d.id" :value="d.domain">@{{ d.domain }}</option>
              </select>
              <div v-else class="flex items-center rounded border border-[#e0e6ed] bg-[#fbfbfb] px-3 text-sm font-semibold text-white-dark dark:border-[#1b2e4b] dark:bg-[#121c2c]">
                @{{ cDomain }}
              </div>
            </div>
            <p
              v-if="cUsername.trim()"
              class="mt-1.5 text-xs"
              :class="emailCheckError || emailAvailable === false ? 'text-danger' : emailAvailable === true ? 'text-success' : 'text-white-dark'"
            >
              <template v-if="emailCheckError">{{ emailCheckError }}</template>
              <template v-else-if="checkingEmail">Checking availability…</template>
              <template v-else-if="emailAvailable === true">✓ {{ cEmail }} is available</template>
              <template v-else-if="emailAvailable === false">✕ {{ cEmail }} is already taken</template>
              <template v-else>{{ cEmail }}</template>
            </p>
          </div>

          <!-- Name -->
          <div>
            <label for="create-name" class="mb-1.5 block font-semibold dark:text-white-light">Name <span class="font-normal text-white-dark">(optional)</span></label>
            <input id="create-name" v-model="cName" type="text" class="form-input" placeholder="Full name" autocomplete="off">
          </div>

          <!-- Role -->
          <div v-if="invitableRoles.length > 1">
            <label for="create-role" class="mb-1.5 block font-semibold dark:text-white-light">Role</label>
            <select id="create-role" v-model="cRole" class="form-select capitalize">
              <option v-for="r in invitableRoles" :key="r" :value="r" class="capitalize">{{ r }}</option>
            </select>
          </div>

          <!-- Password + confirm -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="create-pw" class="mb-1.5 block font-semibold dark:text-white-light">Password</label>
              <input id="create-pw" v-model="cPassword" type="password" class="form-input" autocomplete="new-password" placeholder="At least 8 characters" required>
            </div>
            <div>
              <label for="create-pw2" class="mb-1.5 block font-semibold dark:text-white-light">Confirm password</label>
              <input id="create-pw2" v-model="cConfirm" type="password" class="form-input" autocomplete="new-password" required>
            </div>
          </div>

          <div v-if="createError" class="flex items-center gap-2 rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
            <icon-info-triangle class="h-4 w-4 shrink-0" />
            {{ createError }}
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" class="btn btn-outline-danger" @click="createOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary gap-2" :disabled="creating || checkingEmail || emailAvailable === false">
              <icon-loader v-if="creating" class="h-4 w-4 animate-spin" />
              {{ creating ? 'Creating…' : 'Create user' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Invite modal -->
    <div v-if="inviteOpen" class="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
      <div class="panel w-full max-w-lg overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] px-5 py-3.5 dark:bg-[#121c2c]">
          <h5 class="text-lg font-semibold dark:text-white-light">Invite a user</h5>
          <button type="button" class="text-white-dark outline-none hover:text-danger" @click="inviteOpen = false">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <form class="space-y-5 p-5" @submit.prevent="submitInvite">
          <p class="text-sm text-white-dark">
            We'll email an invitation link. They'll set their own password when they accept.
          </p>
          <div>
            <label for="invite-email" class="mb-1.5 block font-semibold dark:text-white-light">Email</label>
            <div class="relative">
              <span class="absolute top-1/2 -translate-y-1/2 text-white-dark ltr:left-3 rtl:right-3">
                <icon-mail class="h-5 w-5" />
              </span>
              <input id="invite-email" v-model="inviteEmail" type="email" class="form-input ltr:pl-10 rtl:pr-10" placeholder="name@example.com" autocomplete="off" required>
            </div>
          </div>
          <div v-if="invitableRoles.length > 1">
            <label for="invite-role" class="mb-1.5 block font-semibold dark:text-white-light">Role</label>
            <select id="invite-role" v-model="inviteRole" class="form-select capitalize">
              <option v-for="r in invitableRoles" :key="r" :value="r" class="capitalize">{{ r }}</option>
            </select>
          </div>
          <div v-if="inviteError" class="flex items-center gap-2 rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
            <icon-info-triangle class="h-4 w-4 shrink-0" />
            {{ inviteError }}
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" class="btn btn-outline-danger" @click="inviteOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary gap-2" :disabled="inviting">
              <icon-loader v-if="inviting" class="h-4 w-4 animate-spin" />
              {{ inviting ? 'Sending…' : 'Send invite' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Set password modal -->
    <div v-if="pwOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-10">
      <div class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
          <h5 class="text-lg font-bold dark:text-white-light">Set new password</h5>
          <button type="button" class="text-gray-400 hover:text-gray-800 dark:hover:text-gray-600" @click="pwOpen = false">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="submitSetPassword">
          <p class="text-sm text-white-dark">
            Set a password for <span class="font-semibold text-dark dark:text-white-light">{{ pwTarget?.name || pwTarget?.email }}</span>. Share it securely — they can change it later.
          </p>
          <div>
            <label class="mb-1.5 block font-semibold">New password</label>
            <input v-model="pwNew" type="password" class="form-input" autocomplete="new-password" placeholder="At least 8 characters" required />
          </div>
          <div>
            <label class="mb-1.5 block font-semibold">Confirm new password</label>
            <input v-model="pwConfirm" type="password" class="form-input" autocomplete="new-password" required />
          </div>
          <div v-if="pwError" class="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{{ pwError }}</div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-outline-danger" @click="pwOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="pwSaving">{{ pwSaving ? 'Saving…' : 'Set password' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
