<script lang="ts" setup>
import type { PlatformOrgUser } from '@/composables/usePlatform'

definePageMeta({ layout: 'platform' })
useHead({ title: 'Orb mailboxes' })

const toast = useToast()
const { canMutate } = usePlatform()
const {
  listMailboxes,
  createMailbox,
  deleteMailbox,
  resetMailboxPassword,
  suspendMailbox,
  unsuspendMailbox,
} = usePlatformMailboxes()

const { data: mailboxes, pending, error, refresh } = await useAsyncData('pf-mailboxes', () => listMailboxes())

const busyId = ref<string | null>(null)

// ── Create dialog ──────────────────────────────────────────────────────
const dialogOpen = ref(false)
const newEmail = ref('')
const newName = ref('')
const newRole = ref<'admin' | 'member'>('member')
const submitting = ref(false)
const submitError = ref('')

function openDialog() {
  newEmail.value = ''
  newName.value = ''
  newRole.value = 'member'
  submitError.value = ''
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
}

async function onCreate() {
  if (submitting.value) return
  submitError.value = ''
  const email = newEmail.value.trim().toLowerCase()
  if (!email) {
    submitError.value = 'Enter an email address.'
    return
  }
  submitting.value = true
  try {
    await createMailbox({ email, name: newName.value.trim() || undefined, role: newRole.value })
    dialogOpen.value = false
    await refresh()
    toast.success('Mailbox created — an invite email was sent.')
  }
  catch (e) {
    submitError.value = errMsg(e, 'Could not create mailbox')
    toast.error(submitError.value)
  }
  finally {
    submitting.value = false
  }
}

// ── Row actions ────────────────────────────────────────────────────────
async function onResetPassword(u: PlatformOrgUser) {
  const ok = await toast.confirm({
    title: 'Reset password?',
    text: `Send a password reset for ${u.email}?`,
    confirmText: 'Reset password',
  })
  if (!ok) return
  busyId.value = u.id
  try {
    await resetMailboxPassword(u.id)
    toast.success('Password reset triggered.')
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to reset password'))
  }
  finally {
    busyId.value = null
  }
}

async function onToggle(u: PlatformOrgUser) {
  if (u.status !== 'suspended') {
    const ok = await toast.confirm({
      title: 'Suspend mailbox?',
      text: `Suspend ${u.email}? They will be signed out and blocked until reactivated.`,
      confirmText: 'Suspend',
      danger: true,
    })
    if (!ok) return
  }
  busyId.value = u.id
  try {
    if (u.status === 'suspended') {
      await unsuspendMailbox(u.id)
      toast.success('Mailbox reactivated.')
    }
    else {
      await suspendMailbox(u.id)
      toast.success('Mailbox suspended.')
    }
    await refresh()
  }
  catch (e) {
    toast.error(errMsg(e, 'Action failed'))
  }
  finally {
    busyId.value = null
  }
}

async function onDelete(u: PlatformOrgUser) {
  const ok = await toast.confirm({
    title: 'Delete mailbox?',
    text: `Permanently delete ${u.email}? This cannot be undone.`,
    confirmText: 'Delete mailbox',
    danger: true,
  })
  if (!ok) return
  busyId.value = u.id
  try {
    await deleteMailbox(u.id)
    toast.success('Mailbox deleted.')
    await refresh()
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to delete mailbox'))
  }
  finally {
    busyId.value = null
  }
}

const statusBadge: Record<string, string> = {
  active: 'badge bg-success',
  invited: 'badge bg-warning',
  suspended: 'badge bg-danger',
}
const roleBadge: Record<string, string> = {
  owner: 'badge bg-primary',
  admin: 'badge bg-info',
  member: 'badge bg-secondary',
  api_user: 'badge bg-dark',
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-dark dark:text-white-light">Orb mailboxes</h1>
        <p class="mt-1 text-sm text-white-dark">Employee mailboxes on Orb's own @orb.bd domain.</p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-outline-primary btn-sm gap-2" :disabled="pending" @click="refresh()">
          <icon-refresh class="h-4 w-4" :class="pending ? 'animate-spin' : ''" />
          Refresh
        </button>
        <button v-if="canMutate" type="button" class="btn btn-primary gap-2" @click="openDialog">
          <icon-plus class="h-4 w-4" /> Create mailbox
        </button>
      </div>
    </div>

    <!-- Info note -->
    <div class="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary-light p-4 dark:bg-primary/10">
      <div class="grid h-10 w-10 shrink-0 place-content-center rounded-lg bg-primary/20 text-primary"><icon-mail class="h-5 w-5" /></div>
      <div class="flex-1 text-sm text-white-dark">
        Employees accept the invite email, set a password, then log into the app at
        <code class="font-mono">/app</code> to use their <span class="font-semibold">@orb.bd</span> mailbox.
        Requires <span class="font-semibold">orb.bd</span> to be a verified domain.
      </div>
    </div>

    <!-- Load error -->
    <div v-if="error" class="panel border border-danger/40 text-sm text-danger">
      {{ errMsg(error, 'Could not load mailboxes') }}
    </div>

    <!-- Loading -->
    <div v-else-if="pending && !mailboxes" class="panel text-center text-white-dark">
      Loading…
    </div>

    <!-- Empty -->
    <div v-else-if="!mailboxes?.length" class="panel">
      <div class="flex flex-col items-center gap-4 py-14 text-center">
        <div class="grid h-16 w-16 place-content-center rounded-2xl bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
          <icon-mail class="h-7 w-7" />
        </div>
        <div>
          <div class="text-lg font-semibold dark:text-white-light">No mailboxes yet</div>
          <div class="text-sm text-white-dark">Create the first employee mailbox on @orb.bd.</div>
        </div>
        <button v-if="canMutate" type="button" class="btn btn-primary gap-2" @click="openDialog">
          <icon-plus class="h-4 w-4" /> Create mailbox
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="panel">
      <h2 class="mb-4 text-lg font-semibold text-dark dark:text-white-light">
        Mailboxes <span class="text-sm font-normal text-white-dark">({{ mailboxes.length }})</span>
      </h2>
      <div class="table-responsive">
        <table class="table-hover">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>2FA</th>
              <th v-if="canMutate" class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in mailboxes" :key="u.id">
              <td class="font-semibold text-dark dark:text-white-light">{{ u.email }}</td>
              <td class="text-white-dark">{{ u.name || '—' }}</td>
              <td><span :class="roleBadge[u.role] || 'badge bg-secondary'" class="capitalize">{{ u.role.replace('_', ' ') }}</span></td>
              <td><span :class="statusBadge[u.status] || 'badge bg-secondary'" class="capitalize">{{ u.status }}</span></td>
              <td>
                <span v-if="u.two_fa_enabled" class="badge bg-success">On</span>
                <span v-else class="text-white-dark">Off</span>
              </td>
              <td v-if="canMutate">
                <div class="flex flex-wrap justify-center gap-1.5">
                  <button
                    type="button"
                    class="btn btn-outline-primary btn-sm"
                    :disabled="busyId === u.id"
                    @click="onResetPassword(u)"
                  >
                    Reset PW
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="u.status === 'suspended' ? 'btn-success' : 'btn-danger'"
                    :disabled="busyId === u.id || u.role === 'owner'"
                    :title="u.role === 'owner' ? 'Owners cannot be suspended' : ''"
                    @click="onToggle(u)"
                  >
                    {{ u.status === 'suspended' ? 'Reactivate' : 'Suspend' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    :disabled="busyId === u.id || u.role === 'owner'"
                    :title="u.role === 'owner' ? 'Owners cannot be deleted' : ''"
                    @click="onDelete(u)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create mailbox dialog -->
    <div v-if="dialogOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
      <div class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] py-3 px-5 dark:bg-[#121c2c]">
          <h5 class="text-lg font-bold dark:text-white-light">Create mailbox</h5>
          <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="closeDialog">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="onCreate">
          <div>
            <label for="mb-email" class="mb-1.5 block font-semibold">Email</label>
            <input id="mb-email" v-model="newEmail" type="email" class="form-input" placeholder="name@orb.bd" autocomplete="off" required />
            <p class="mt-1 text-xs text-white-dark">Type the full address, e.g. <code class="font-mono">jane@orb.bd</code>.</p>
          </div>
          <div>
            <label for="mb-name" class="mb-1.5 block font-semibold">Name</label>
            <input id="mb-name" v-model="newName" type="text" class="form-input" placeholder="Jane Doe" autocomplete="off" />
          </div>
          <div>
            <label for="mb-role" class="mb-1.5 block font-semibold">Role</label>
            <select id="mb-role" v-model="newRole" class="form-select">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div v-if="submitError" class="rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
            {{ submitError }}
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-outline-primary" @click="closeDialog">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Creating…' : 'Create mailbox' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
