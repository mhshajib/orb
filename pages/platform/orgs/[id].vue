<script setup lang="ts">
import type { PlanLimitsOverride, PlatformOrg, PlatformOrgUser } from '~/composables/usePlatform'

definePageMeta({ layout: 'platform' })

const route = useRoute()
const toast = useToast()
const {
  getOrg,
  listOrgUsers,
  suspendOrg,
  unsuspendOrg,
  resetUserPassword,
  resetUser2FA,
  suspendUser,
  unsuspendUser,
  setOrgPlan,
  setOrgLimits,
  clearOrgLimits,
  canMutate,
} = usePlatform()

const orgId = computed(() => route.params.id as string)

const org = ref<PlatformOrg | null>(null)
const users = ref<PlatformOrgUser[]>([])
const loading = ref(false)
const error = ref('')
const orgBusy = ref(false)
const userBusy = ref<string | null>(null)

// Plan & custom-limits management
const PLAN_OPTIONS = ['free', 'startup', 'business', 'enterprise'] as const
const selectedPlan = ref<string>('free')
const planBusy = ref(false)
const limitsBusy = ref(false)

interface LimitsForm {
  emails_per_month: number | null
  users: number | null
  domains: number | null
  webhooks: number | null
  retention_days: number | null
  monthly_bdt: number | null
  // null = "leave as-is". A plain boolean could not express that, so a blank
  // form always sent false and silently stripped large-attachment support.
  attachments_over_2m: boolean | null
}
function emptyLimitsForm(): LimitsForm {
  return {
    emails_per_month: null,
    users: null,
    domains: null,
    webhooks: null,
    retention_days: null,
    monthly_bdt: null,
    attachments_over_2m: null,
  }
}
const limitsForm = ref<LimitsForm>(emptyLimitsForm())

/**
 * Load the org's stored override into the edit form.
 *
 * Without this the form was always blank, so staff had no idea what was
 * currently set and could not tell an unset cap from a zero one - the fields
 * simply never reflected saved state.
 */
function fillLimitsForm() {
  const c = org.value?.custom_limits
  if (!c) {
    limitsForm.value = emptyLimitsForm()
    return
  }
  limitsForm.value = {
    emails_per_month: c.emails_per_month ?? null,
    users: c.users ?? null,
    domains: c.domains ?? null,
    webhooks: c.webhooks ?? null,
    retention_days: c.retention_days ?? null,
    monthly_bdt: c.monthly_price_paisa != null ? Math.round(c.monthly_price_paisa / 100) : null,
    attachments_over_2m: c.attachments_over_2m ?? null,
  }
}

// Limit overrides use -1 to mean "Unlimited" (not null).
function fmtLimit(n?: number): string {
  if (n == null)
    return '—'
  return n === -1 ? 'Unlimited' : new Intl.NumberFormat().format(n)
}

// The active overrides, as tiles. Built here rather than in the template so the
// grid stays a single v-for instead of seven hand-written blocks.
const customLimitTiles = computed(() => {
  const c = org.value?.custom_limits
  if (!c)
    return []
  return [
    { label: 'Emails / month', value: fmtLimit(c.emails_per_month) },
    { label: 'Users', value: fmtLimit(c.users) },
    { label: 'Domains', value: fmtLimit(c.domains) },
    { label: 'Webhooks', value: fmtLimit(c.webhooks) },
    { label: 'Retention', value: c.retention_days == null ? '—' : c.retention_days === -1 ? 'Unlimited' : `${c.retention_days} days` },
    { label: 'Monthly price', value: c.monthly_price_paisa != null ? formatPaisaBDT(c.monthly_price_paisa) : '—' },
    { label: 'Attachments > 2 MB', value: c.attachments_over_2m ? 'Allowed' : 'No' },
  ]
})

useHead(() => ({ title: org.value ? org.value.name : 'Organization' }))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [o, u] = await Promise.all([
      getOrg(orgId.value),
      listOrgUsers(orgId.value, { limit: 100, offset: 0 }),
    ])
    org.value = o
    users.value = u
    selectedPlan.value = o.plan
    fillLimitsForm()
  }
  catch (e) {
    error.value = errMsg(e, 'Failed to load organization')
  }
  finally {
    loading.value = false
  }
}

async function reloadUsers() {
  try {
    users.value = await listOrgUsers(orgId.value, { limit: 100, offset: 0 })
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to refresh users'))
  }
}

onMounted(load)

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const planBadge: Record<string, string> = {
  free: 'badge bg-secondary',
  startup: 'badge bg-info',
  business: 'badge bg-primary',
  enterprise: 'badge bg-dark',
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

async function onToggleOrg() {
  if (!org.value)
    return
  if (!org.value.suspended) {
    const ok = await toast.confirm({
      title: 'Suspend organization?',
      text: `Suspend "${org.value.name}"? Members lose access until restored.`,
      confirmText: 'Suspend',
      danger: true,
    })
    if (!ok)
      return
  }
  orgBusy.value = true
  try {
    if (org.value.suspended) {
      await unsuspendOrg(org.value.id)
      toast.success('Organization restored')
    }
    else {
      await suspendOrg(org.value.id)
      toast.success('Organization suspended')
    }
    org.value = await getOrg(orgId.value)
  }
  catch (e) {
    toast.error(errMsg(e, 'Action failed'))
  }
  finally {
    orgBusy.value = false
  }
}

async function refreshOrg() {
  org.value = await getOrg(orgId.value)
  if (org.value)
    selectedPlan.value = org.value.plan
  fillLimitsForm()
}

async function onApplyPlan() {
  if (!org.value || planBusy.value)
    return
  if (selectedPlan.value === org.value.plan) {
    toast.info('Plan unchanged')
    return
  }
  const ok = await toast.confirm({
    title: 'Change plan?',
    text: `Switch "${org.value.name}" from ${org.value.plan} to ${selectedPlan.value}?`,
    confirmText: 'Change plan',
  })
  if (!ok)
    return
  planBusy.value = true
  try {
    await setOrgPlan(org.value.id, selectedPlan.value)
    toast.success('Plan updated')
    await refreshOrg()
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to change plan'))
  }
  finally {
    planBusy.value = false
  }
}

async function onSetLimits() {
  if (!org.value || limitsBusy.value)
    return
  const f = limitsForm.value
  // Only send fields the staff actually filled in.
  const limits: PlanLimitsOverride = {}
  if (f.emails_per_month != null) limits.emails_per_month = Number(f.emails_per_month)
  if (f.users != null) limits.users = Number(f.users)
  if (f.domains != null) limits.domains = Number(f.domains)
  if (f.webhooks != null) limits.webhooks = Number(f.webhooks)
  if (f.retention_days != null) limits.retention_days = Number(f.retention_days)
  if (f.monthly_bdt != null) limits.monthly_price_paisa = Math.round(f.monthly_bdt * 100)
  if (f.attachments_over_2m != null) limits.attachments_over_2m = f.attachments_over_2m

  const ok = await toast.confirm({
    title: 'Set custom limits?',
    text: `Apply negotiated custom limits to "${org.value.name}"? These override the plan's defaults.`,
    confirmText: 'Set limits',
  })
  if (!ok)
    return
  limitsBusy.value = true
  try {
    await setOrgLimits(org.value.id, limits)
    toast.success('Custom limits set')
    // refreshOrg() repopulates the form from what was actually saved, so the
    // fields show the stored values rather than being blanked.
    await refreshOrg()
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to set custom limits'))
  }
  finally {
    limitsBusy.value = false
  }
}

async function onClearLimits() {
  if (!org.value || limitsBusy.value)
    return
  const ok = await toast.confirm({
    title: 'Clear custom limits?',
    text: `Remove the custom limit overrides for "${org.value.name}"? They will fall back to their plan's defaults.`,
    confirmText: 'Clear limits',
    danger: true,
  })
  if (!ok)
    return
  limitsBusy.value = true
  try {
    await clearOrgLimits(org.value.id)
    toast.success('Custom limits cleared')
    await refreshOrg()
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to clear custom limits'))
  }
  finally {
    limitsBusy.value = false
  }
}

async function onResetPassword(u: PlatformOrgUser) {
  const ok = await toast.confirm({
    title: 'Reset password?',
    text: `Send a password reset for ${u.email}?`,
    confirmText: 'Reset password',
  })
  if (!ok)
    return
  userBusy.value = u.id
  try {
    await resetUserPassword(u.id)
    toast.success('Password reset triggered')
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to reset password'))
  }
  finally {
    userBusy.value = null
  }
}

async function onReset2FA(u: PlatformOrgUser) {
  const ok = await toast.confirm({
    title: 'Reset 2FA?',
    text: `Remove two-factor for ${u.email}? They will be able to sign in without it until re-enrolled.`,
    confirmText: 'Reset 2FA',
    danger: true,
  })
  if (!ok)
    return
  userBusy.value = u.id
  try {
    await resetUser2FA(u.id)
    toast.success('2FA reset')
    await reloadUsers()
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to reset 2FA'))
  }
  finally {
    userBusy.value = null
  }
}

async function onToggleUser(u: PlatformOrgUser) {
  if (u.status !== 'suspended') {
    const ok = await toast.confirm({
      title: 'Suspend user?',
      text: `Suspend ${u.email}? They will be signed out and blocked.`,
      confirmText: 'Suspend',
      danger: true,
    })
    if (!ok)
      return
  }
  userBusy.value = u.id
  try {
    if (u.status === 'suspended') {
      await unsuspendUser(u.id)
      toast.success('User restored')
    }
    else {
      await suspendUser(u.id)
      toast.success('User suspended')
    }
    await reloadUsers()
  }
  catch (e) {
    toast.error(errMsg(e, 'Action failed'))
  }
  finally {
    userBusy.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <NuxtLink to="/platform" class="btn btn-outline-primary btn-sm gap-1">
          <icon-arrow-left class="h-4 w-4" />
          Back
        </NuxtLink>
        <h1 class="text-2xl font-bold text-dark dark:text-white-light">{{ org?.name || 'Organization' }}</h1>
      </div>
      <button type="button" class="btn btn-outline-primary btn-sm gap-2" :disabled="loading" @click="load">
        <icon-refresh class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </button>
    </div>

    <div v-if="error" class="panel border border-danger/40 text-sm text-danger">
      {{ error }}
    </div>

    <div v-else-if="loading && !org" class="panel text-center text-white-dark">
      Loading…
    </div>

    <template v-else-if="org">
      <!-- Org info -->
      <div class="panel">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-dark dark:text-white-light">Details</h2>
          <button
            v-if="canMutate && !org.is_system"
            type="button"
            class="btn btn-sm"
            :class="org.suspended ? 'btn-success' : 'btn-danger'"
            :disabled="orgBusy"
            @click="onToggleOrg"
          >
            {{ org.suspended ? 'Unsuspend org' : 'Suspend org' }}
          </button>
        </div>
        <div class="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div class="text-xs uppercase text-white-dark">Name</div>
            <div class="flex items-center gap-2 font-semibold text-dark dark:text-white-light">
              {{ org.name }}
              <span v-if="org.is_system" class="badge bg-warning">System</span>
            </div>
          </div>
          <div>
            <div class="text-xs uppercase text-white-dark">Slug</div>
            <div class="font-mono text-sm">{{ org.slug }}</div>
          </div>
          <div>
            <div class="text-xs uppercase text-white-dark">Plan</div>
            <span :class="planBadge[org.plan] || 'badge bg-secondary'" class="capitalize">{{ org.plan }}</span>
          </div>
          <div>
            <div class="text-xs uppercase text-white-dark">2FA enforcement</div>
            <span v-if="org.enforce_2fa" class="badge bg-success">Enforced</span>
            <span v-else class="text-white-dark">Not enforced</span>
          </div>
          <div>
            <div class="text-xs uppercase text-white-dark">Status</div>
            <span v-if="org.suspended" class="badge bg-danger">Suspended</span>
            <span v-else class="badge bg-success">Active</span>
          </div>
          <div>
            <div class="text-xs uppercase text-white-dark">Created</div>
            <div>{{ fmtDate(org.created_at) }}</div>
          </div>
        </div>
      </div>

      <!-- Plan & billing -->
      <div class="panel">
        <h2 class="mb-4 text-lg font-semibold text-dark dark:text-white-light">Plan &amp; billing</h2>

        <div class="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <div class="text-xs uppercase text-white-dark">Current plan</div>
            <span :class="planBadge[org.plan] || 'badge bg-secondary'" class="mt-1 inline-block capitalize">{{ org.plan }}</span>
          </div>
          <div v-if="canMutate">
            <label class="text-xs uppercase text-white-dark">Change plan</label>
            <div class="mt-1 flex gap-2">
              <select v-model="selectedPlan" class="form-select capitalize" :disabled="planBusy">
                <option v-for="p in PLAN_OPTIONS" :key="p" :value="p" class="capitalize">{{ p }}</option>
              </select>
              <button type="button" class="btn btn-primary" :disabled="planBusy" @click="onApplyPlan">Apply</button>
            </div>
          </div>
        </div>

        <hr class="my-5 border-white-light dark:border-[#1b2e4b]" />

        <!-- Custom limits -->
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <h3 class="text-base font-semibold text-dark dark:text-white-light">Custom limits</h3>
          <span v-if="org.custom_limits" class="badge bg-warning">Custom limits active</span>
          <span v-else class="text-sm text-white-dark">Using plan defaults</span>
        </div>

        <!-- Active overrides. Same tile treatment as the customer's billing
             page, so staff and customer read the same numbers the same way. -->
        <div v-if="org.custom_limits" class="mb-5">
          <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            <div
              v-for="t in customLimitTiles"
              :key="t.label"
              class="rounded-lg border border-white-light bg-[#fbfbfb] px-3 py-2.5 dark:border-[#1b2e4b] dark:bg-[#1a2941]"
            >
              <div class="truncate text-[11px] font-semibold uppercase tracking-wide text-white-dark">{{ t.label }}</div>
              <div class="mt-0.5 truncate text-lg font-bold text-primary">{{ t.value }}</div>
            </div>
          </div>
          <button
            v-if="canMutate"
            type="button"
            class="btn btn-outline-danger btn-sm mt-4"
            :disabled="limitsBusy"
            @click="onClearLimits"
          >
            Clear custom limits
          </button>
        </div>

        <!-- Set custom limits form -->
        <form v-if="canMutate" class="space-y-4" @submit.prevent="onSetLimits">
          <div class="text-sm font-semibold text-dark dark:text-white-light">Set custom limits</div>
          <p class="text-xs text-white-dark">Leave a field blank to keep the plan default for it. Use <code class="font-mono">-1</code> for unlimited.</p>
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="mb-1.5 block text-sm font-semibold">Emails / month</label>
              <input v-model.number="limitsForm.emails_per_month" type="number" min="-1" step="1" class="form-input" placeholder="inherit" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-semibold">Users</label>
              <input v-model.number="limitsForm.users" type="number" min="-1" step="1" class="form-input" placeholder="inherit" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-semibold">Domains</label>
              <input v-model.number="limitsForm.domains" type="number" min="-1" step="1" class="form-input" placeholder="inherit" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-semibold">Webhooks</label>
              <input v-model.number="limitsForm.webhooks" type="number" min="-1" step="1" class="form-input" placeholder="inherit" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-semibold">Retention (days)</label>
              <input v-model.number="limitsForm.retention_days" type="number" min="-1" step="1" class="form-input" placeholder="inherit" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-semibold">Monthly price (৳)</label>
              <input v-model.number="limitsForm.monthly_bdt" type="number" min="0" step="1" class="form-input" placeholder="inherit" />
            </div>
          </div>
          <p class="text-xs text-white-dark">
            Blank inherits from the plan. <span class="font-mono font-semibold">-1</span> is unlimited, <span class="font-mono font-semibold">0</span> means none allowed.
            Fields you leave blank are left exactly as they are.
          </p>
          <div>
            <label class="mb-1.5 block text-sm font-semibold">Attachments over 2 MB</label>
            <select v-model="limitsForm.attachments_over_2m" class="form-select w-auto">
              <option :value="null">Inherit from plan</option>
              <option :value="true">Allowed</option>
              <option :value="false">Not allowed</option>
            </select>
          </div>
          <div>
            <button type="submit" class="btn btn-primary" :disabled="limitsBusy">
              {{ limitsBusy ? 'Saving…' : 'Set custom limits' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Users -->
      <div class="panel">
        <h2 class="mb-4 text-lg font-semibold text-dark dark:text-white-light">
          Users <span class="text-sm font-normal text-white-dark">({{ users.length }})</span>
        </h2>
        <div class="table-responsive">
          <table class="table-hover">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Provider</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!users.length">
                <td colspan="7" class="text-center text-white-dark">No users.</td>
              </tr>
              <tr v-for="u in users" v-else :key="u.id">
                <td class="font-semibold text-dark dark:text-white-light">{{ u.name || '—' }}</td>
                <td class="text-white-dark">{{ u.email }}</td>
                <td><span :class="roleBadge[u.role] || 'badge bg-secondary'" class="capitalize">{{ u.role.replace('_', ' ') }}</span></td>
                <td><span :class="statusBadge[u.status] || 'badge bg-secondary'" class="capitalize">{{ u.status }}</span></td>
                <td>
                  <span v-if="u.two_fa_enabled" class="badge bg-success">On</span>
                  <span v-else class="text-white-dark">Off</span>
                </td>
                <td class="capitalize text-white-dark">{{ u.auth_provider }}</td>
                <td>
                  <div class="flex flex-wrap justify-center gap-1.5">
                    <button
                      type="button"
                      class="btn btn-outline-primary btn-sm"
                      :disabled="userBusy === u.id"
                      @click="onResetPassword(u)"
                    >
                      Reset PW
                    </button>
                    <button
                      v-if="canMutate"
                      type="button"
                      class="btn btn-outline-warning btn-sm"
                      :disabled="userBusy === u.id || !u.two_fa_enabled"
                      @click="onReset2FA(u)"
                    >
                      Reset 2FA
                    </button>
                    <button
                      v-if="canMutate"
                      type="button"
                      class="btn btn-sm"
                      :class="u.status === 'suspended' ? 'btn-success' : 'btn-danger'"
                      :disabled="userBusy === u.id || u.role === 'owner'"
                      :title="u.role === 'owner' ? 'Owners cannot be suspended' : ''"
                      @click="onToggleUser(u)"
                    >
                      {{ u.status === 'suspended' ? 'Unsuspend' : 'Suspend' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
