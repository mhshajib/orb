<script lang="ts" setup>
import type { PlatformRole } from '@/composables/usePlatform'
import type { PlatformStaff } from '@/composables/usePlatformStaff'

definePageMeta({ layout: 'platform' })
useHead({ title: 'Orb staff' })

const toast = useToast()
const { pUser, resetStaff2FA } = usePlatform()
const { listStaff, createStaff, updateStaff, resetStaffPassword } = usePlatformStaff()

const isSuperAdmin = computed(() => pUser.value?.role === 'platform:super_admin')

// Only fetch when allowed — keeps the API from 403'ing for non-super-admins.
const { data: staff, pending, error, refresh } = await useAsyncData(
  'pf-staff',
  () => (isSuperAdmin.value ? listStaff() : Promise.resolve([] as PlatformStaff[])),
)

const busyId = ref<string | null>(null)

const roleOptions: { value: PlatformRole, label: string }[] = [
  { value: 'platform:super_admin', label: 'Super admin' },
  { value: 'platform:admin', label: 'Admin' },
  { value: 'platform:support', label: 'Support' },
]
const roleBadge: Record<string, string> = {
  'platform:super_admin': 'badge bg-primary',
  'platform:admin': 'badge bg-info',
  'platform:support': 'badge bg-secondary',
}
function roleLabel(role: string) {
  return roleOptions.find(r => r.value === role)?.label || role
}

// ── Create dialog ──────────────────────────────────────────────────────
const createOpen = ref(false)
const cEmail = ref('')
const cName = ref('')
const cRole = ref<PlatformRole>('platform:support')
const cPassword = ref('')
const creating = ref(false)
const createError = ref('')

function openCreate() {
  cEmail.value = ''
  cName.value = ''
  cRole.value = 'platform:support'
  cPassword.value = ''
  createError.value = ''
  createOpen.value = true
}

async function onCreate() {
  if (creating.value) return
  createError.value = ''
  const email = cEmail.value.trim().toLowerCase()
  if (!email) {
    createError.value = 'Enter an email address.'
    return
  }
  if (cPassword.value.length < 8) {
    createError.value = 'Password must be at least 8 characters.'
    return
  }
  creating.value = true
  try {
    await createStaff({ email, name: cName.value.trim() || undefined, role: cRole.value, password: cPassword.value })
    createOpen.value = false
    await refresh()
    toast.success('Staff member created.')
  }
  catch (e) {
    createError.value = errMsg(e, 'Could not create staff member')
    toast.error(createError.value)
  }
  finally {
    creating.value = false
  }
}

// ── Edit dialog ────────────────────────────────────────────────────────
const editOpen = ref(false)
const editTarget = ref<PlatformStaff | null>(null)
const eName = ref('')
const eRole = ref<PlatformRole>('platform:support')
const eActive = ref(true)
const editing = ref(false)
const editError = ref('')

function openEdit(s: PlatformStaff) {
  editTarget.value = s
  eName.value = s.name
  eRole.value = s.role
  eActive.value = s.active
  editError.value = ''
  editOpen.value = true
}

async function onEdit() {
  if (editing.value || !editTarget.value) return
  editError.value = ''
  editing.value = true
  try {
    await updateStaff(editTarget.value.id, { name: eName.value.trim(), role: eRole.value, active: eActive.value })
    editOpen.value = false
    await refresh()
    toast.success('Staff member updated.')
  }
  catch (e) {
    // Backend rejects self-demotion / self-disable — surface it gracefully.
    editError.value = errMsg(e, 'Could not update staff member')
    toast.error(editError.value)
  }
  finally {
    editing.value = false
  }
}

// ── Reset password dialog ──────────────────────────────────────────────
const pwOpen = ref(false)
const pwTarget = ref<PlatformStaff | null>(null)
const pwValue = ref('')
const pwBusy = ref(false)
const pwError = ref('')

function openReset(s: PlatformStaff) {
  pwTarget.value = s
  pwValue.value = ''
  pwError.value = ''
  pwOpen.value = true
}

async function onReset() {
  if (pwBusy.value || !pwTarget.value) return
  pwError.value = ''
  if (pwValue.value.length < 8) {
    pwError.value = 'Password must be at least 8 characters.'
    return
  }
  pwBusy.value = true
  try {
    await resetStaffPassword(pwTarget.value.id, pwValue.value)
    pwOpen.value = false
    toast.success('Password reset.')
  }
  catch (e) {
    pwError.value = errMsg(e, 'Could not reset password')
    toast.error(pwError.value)
  }
  finally {
    pwBusy.value = false
  }
}

// ── Enable / disable toggle ────────────────────────────────────────────
async function onToggleActive(s: PlatformStaff) {
  if (!s.active) {
    // re-enable directly
  }
  else {
    const ok = await toast.confirm({
      title: 'Disable staff member?',
      text: `Disable ${s.email}? They will be unable to sign in to the console until re-enabled.`,
      confirmText: 'Disable',
      danger: true,
    })
    if (!ok) return
  }
  busyId.value = s.id
  try {
    await updateStaff(s.id, { name: s.name, role: s.role, active: !s.active })
    toast.success(s.active ? 'Staff member disabled.' : 'Staff member enabled.')
    await refresh()
  }
  catch (e) {
    toast.error(errMsg(e, 'Action failed'))
  }
  finally {
    busyId.value = null
  }
}

function isSelf(s: PlatformStaff) {
  return s.id === pUser.value?.user_id
}

// ── Reset a staffer's 2FA (lockout recovery) ───────────────────────────
async function onReset2FA(s: PlatformStaff) {
  const ok = await toast.confirm({
    title: 'Reset two-factor auth?',
    text: `Clear 2FA for ${s.email}? They'll sign in with just a password until they re-enrol.`,
    confirmText: 'Reset 2FA',
    danger: true,
  })
  if (!ok) return
  busyId.value = s.id
  try {
    await resetStaff2FA(s.id)
    toast.success('2FA reset.')
    await refresh()
  }
  catch (e) {
    toast.error(errMsg(e, 'Could not reset 2FA'))
  }
  finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-dark dark:text-white-light">Orb staff</h1>
        <p class="mt-1 text-sm text-white-dark">Manage who can sign in to the Orb console.</p>
      </div>
      <div v-if="isSuperAdmin" class="flex gap-2">
        <button type="button" class="btn btn-outline-primary btn-sm gap-2" :disabled="pending" @click="refresh()">
          <icon-refresh class="h-4 w-4" :class="pending ? 'animate-spin' : ''" />
          Refresh
        </button>
        <button type="button" class="btn btn-primary gap-2" @click="openCreate">
          <icon-plus class="h-4 w-4" /> Add staff
        </button>
      </div>
    </div>

    <!-- Super-admin gate -->
    <div v-if="!isSuperAdmin" class="panel">
      <div class="flex flex-col items-center gap-4 py-14 text-center">
        <div class="grid h-16 w-16 place-content-center rounded-2xl bg-warning/10 text-warning">
          <icon-lock class="h-7 w-7" />
        </div>
        <div>
          <div class="text-lg font-semibold dark:text-white-light">Super-admins only</div>
          <div class="text-sm text-white-dark">You need the super-admin role to manage console staff.</div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Load error -->
      <div v-if="error" class="panel border border-danger/40 text-sm text-danger">
        {{ errMsg(error, 'Could not load staff') }}
      </div>

      <!-- Loading -->
      <div v-else-if="pending && !staff" class="panel text-center text-white-dark">
        Loading…
      </div>

      <!-- Empty -->
      <div v-else-if="!staff?.length" class="panel">
        <div class="flex flex-col items-center gap-4 py-14 text-center">
          <div class="grid h-16 w-16 place-content-center rounded-2xl bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
            <icon-users-group class="h-7 w-7" />
          </div>
          <div>
            <div class="text-lg font-semibold dark:text-white-light">No staff yet</div>
            <div class="text-sm text-white-dark">Add the first console user.</div>
          </div>
          <button type="button" class="btn btn-primary gap-2" @click="openCreate">
            <icon-plus class="h-4 w-4" /> Add staff
          </button>
        </div>
      </div>

      <!-- Table -->
      <div v-else class="panel">
        <h2 class="mb-4 text-lg font-semibold text-dark dark:text-white-light">
          Staff <span class="text-sm font-normal text-white-dark">({{ staff.length }})</span>
        </h2>
        <div class="table-responsive">
          <table class="table-hover">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>2FA</th>
                <th>Active</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in staff" :key="s.id">
                <td class="font-semibold text-dark dark:text-white-light">
                  {{ s.email }}
                  <span v-if="isSelf(s)" class="ml-1 text-xs text-white-dark">(you)</span>
                </td>
                <td class="text-white-dark">{{ s.name || '—' }}</td>
                <td><span :class="roleBadge[s.role] || 'badge bg-secondary'">{{ roleLabel(s.role) }}</span></td>
                <td>
                  <span v-if="s.twofa_enabled" class="badge badge-outline-success">On</span>
                  <span v-else class="badge badge-outline-warning">Off</span>
                </td>
                <td>
                  <span v-if="s.active" class="badge bg-success">Active</span>
                  <span v-else class="badge bg-danger">Disabled</span>
                </td>
                <td>
                  <div class="flex flex-wrap justify-center gap-1.5">
                    <button type="button" class="btn btn-outline-primary btn-sm" :disabled="busyId === s.id" @click="openEdit(s)">
                      Edit
                    </button>
                    <button type="button" class="btn btn-outline-warning btn-sm" :disabled="busyId === s.id" @click="openReset(s)">
                      Reset PW
                    </button>
                    <button v-if="s.twofa_enabled" type="button" class="btn btn-outline-warning btn-sm" :disabled="busyId === s.id" @click="onReset2FA(s)">
                      Reset 2FA
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="s.active ? 'btn-danger' : 'btn-success'"
                      :disabled="busyId === s.id || isSelf(s)"
                      :title="isSelf(s) ? 'You cannot disable yourself' : ''"
                      @click="onToggleActive(s)"
                    >
                      {{ s.active ? 'Disable' : 'Enable' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Create dialog -->
    <div v-if="createOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
      <div class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] py-3 px-5 dark:bg-[#121c2c]">
          <h5 class="text-lg font-bold dark:text-white-light">Add staff</h5>
          <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="createOpen = false">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="onCreate">
          <div>
            <label for="s-email" class="mb-1.5 block font-semibold">Email</label>
            <input id="s-email" v-model="cEmail" type="email" class="form-input" placeholder="staff@orb.bd" autocomplete="off" required />
          </div>
          <div>
            <label for="s-name" class="mb-1.5 block font-semibold">Name</label>
            <input id="s-name" v-model="cName" type="text" class="form-input" placeholder="Jane Doe" autocomplete="off" />
          </div>
          <div>
            <label for="s-role" class="mb-1.5 block font-semibold">Role</label>
            <select id="s-role" v-model="cRole" class="form-select">
              <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
          <div>
            <label for="s-pw" class="mb-1.5 block font-semibold">Initial password</label>
            <input id="s-pw" v-model="cPassword" type="password" class="form-input" autocomplete="new-password" required />
            <p class="mt-1 text-xs text-white-dark">At least 8 characters. Share it securely; the member can change it later.</p>
          </div>
          <div v-if="createError" class="rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
            {{ createError }}
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-outline-primary" @click="createOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="creating">{{ creating ? 'Adding…' : 'Add staff' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit dialog -->
    <div v-if="editOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
      <div class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] py-3 px-5 dark:bg-[#121c2c]">
          <h5 class="text-lg font-bold dark:text-white-light">Edit {{ editTarget?.email }}</h5>
          <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="editOpen = false">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="onEdit">
          <div>
            <label for="e-name" class="mb-1.5 block font-semibold">Name</label>
            <input id="e-name" v-model="eName" type="text" class="form-input" autocomplete="off" />
          </div>
          <div>
            <label for="e-role" class="mb-1.5 block font-semibold">Role</label>
            <select id="e-role" v-model="eRole" class="form-select">
              <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
          <label class="flex cursor-pointer items-center gap-2">
            <input v-model="eActive" type="checkbox" class="form-checkbox" :disabled="editTarget ? isSelf(editTarget) : false" />
            <span class="font-semibold">Active</span>
            <span v-if="editTarget && isSelf(editTarget)" class="text-xs text-white-dark">(you cannot disable yourself)</span>
          </label>
          <div v-if="editError" class="rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
            {{ editError }}
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-outline-primary" @click="editOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="editing">{{ editing ? 'Saving…' : 'Save' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reset password dialog -->
    <div v-if="pwOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
      <div class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] py-3 px-5 dark:bg-[#121c2c]">
          <h5 class="text-lg font-bold dark:text-white-light">Reset password — {{ pwTarget?.email }}</h5>
          <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="pwOpen = false">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="onReset">
          <div>
            <label for="r-pw" class="mb-1.5 block font-semibold">New password</label>
            <input id="r-pw" v-model="pwValue" type="password" class="form-input" autocomplete="new-password" required />
            <p class="mt-1 text-xs text-white-dark">At least 8 characters. Share it securely.</p>
          </div>
          <div v-if="pwError" class="rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
            {{ pwError }}
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-outline-primary" @click="pwOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="pwBusy">{{ pwBusy ? 'Resetting…' : 'Reset password' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
