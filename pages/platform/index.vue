<script setup lang="ts">
import Vue3Datatable from '@bhplugin/vue3-datatable'
import type { PlatformOrg, ResendUsage } from '~/composables/usePlatform'

definePageMeta({ layout: 'platform' })
useHead({ title: 'Organizations' })

const toast = useToast()
const { listOrgs, suspendOrg, unsuspendOrg, canMutate, resendUsage } = usePlatform()

// Resend account usage (shared sending account) — measured from our own data
// against configured caps, since Resend exposes no usage API.
const usage = ref<ResendUsage | null>(null)
async function loadUsage() {
  try { usage.value = await resendUsage() }
  catch { /* non-fatal: card just hides */ }
}
onMounted(loadUsage)
const fmtNum = (n: number) => n.toLocaleString('en-US')
const pct = (used: number, limit: number) => Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
const sendPct = computed(() => usage.value ? pct(usage.value.sent_this_month, usage.value.monthly_send_limit) : 0)
const domainPct = computed(() => usage.value ? pct(usage.value.domains, usage.value.domain_limit) : 0)

const search = ref('')
const status = ref<'all' | 'active' | 'suspended'>('all')
const PER_PAGE = 20
const page = ref(0)
// Mirrors the API's default ordering so the header arrow matches the first load
// instead of showing the list as unsorted.
const sortCol = ref('created_at')
const sortDir = ref<'asc' | 'desc'>('desc')

const orgs = ref<PlatformOrg[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const busyId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const opts: { search?: string, suspended?: boolean, sort: string, order: 'asc' | 'desc', limit: number, offset: number } = {
      sort: sortCol.value,
      order: sortDir.value,
      limit: PER_PAGE,
      offset: page.value * PER_PAGE,
    }
    if (search.value.trim())
      opts.search = search.value.trim()
    if (status.value === 'active')
      opts.suspended = false
    else if (status.value === 'suspended')
      opts.suspended = true
    const res = await listOrgs(opts)
    orgs.value = res.rows
    total.value = res.total
  }
  catch (e) {
    error.value = errMsg(e, 'Failed to load organizations')
    orgs.value = []
    total.value = 0
  }
  finally {
    loading.value = false
  }
}

// Columns for the datatable. Sorting runs on the server; `enforce_2fa` is not
// in the API's sortable whitelist, so its header stays inert rather than
// offering a control that quietly does nothing.
const cols = computed(() => {
  const c: any[] = [
    { field: 'name', title: 'Name' },
    { field: 'slug', title: 'Slug' },
    { field: 'plan', title: 'Plan' },
    { field: 'enforce_2fa', title: '2FA', sort: false },
    { field: 'suspended', title: 'Status' },
    { field: 'created_at', title: 'Created' },
  ]
  if (canMutate)
    c.push({ field: 'actions', title: 'Actions', sort: false, headerClass: 'text-center' })
  return c
})

// Server mode: the datatable reports the page and ordering it wants and we
// refetch, so the row count stays honest instead of paging through whatever
// happens to be loaded. The plugin does not reset to page 1 on a sort change,
// so we follow its page rather than overriding it - resetting here would leave
// the pagination UI pointing at a page the table isn't showing.
function onTableChange(e: { current_page?: number, sort_column?: string, sort_direction?: 'asc' | 'desc' }) {
  page.value = Math.max(0, (e?.current_page ?? 1) - 1)
  sortCol.value = e?.sort_column || 'created_at'
  sortDir.value = e?.sort_direction || 'desc'
  load()
}

// Reset to first page whenever filters change, then reload.
watch([search, status], () => {
  page.value = 0
  load()
})

onMounted(load)

const planBadge: Record<string, string> = {
  free: 'badge bg-secondary',
  startup: 'badge bg-info',
  business: 'badge bg-primary',
  enterprise: 'badge bg-dark',
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function onSuspend(org: PlatformOrg) {
  const ok = await toast.confirm({
    title: 'Suspend organization?',
    text: `Suspend "${org.name}"? Members will lose access until you unsuspend it.`,
    confirmText: 'Suspend',
    danger: true,
  })
  if (!ok)
    return
  busyId.value = org.id
  try {
    await suspendOrg(org.id)
    toast.success('Organization suspended')
    await load()
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to suspend'))
  }
  finally {
    busyId.value = null
  }
}

async function onUnsuspend(org: PlatformOrg) {
  busyId.value = org.id
  try {
    await unsuspendOrg(org.id)
    toast.success('Organization restored')
    await load()
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to unsuspend'))
  }
  finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-dark dark:text-white-light">Organizations</h1>
        <p class="text-sm text-white-dark">Manage tenant orgs across the platform.</p>
      </div>
      <button type="button" class="btn btn-outline-primary btn-sm gap-2" :disabled="loading" @click="load">
        <icon-refresh class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </button>
    </div>

    <!-- Shared Resend account usage -->
    <div v-if="usage" class="panel">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-dark dark:text-white-light">Resend account</h2>
          <p class="text-xs text-white-dark">Shared sending account · usage this month</p>
        </div>
        <a href="https://resend.com/overview" target="_blank" rel="noopener" class="btn btn-outline-primary btn-sm">View on Resend ↗</a>
      </div>
      <div class="grid gap-5 sm:grid-cols-3">
        <div>
          <div class="flex items-baseline justify-between text-sm">
            <span class="text-white-dark">Sending this month</span>
            <span class="font-semibold dark:text-white-light">{{ fmtNum(usage.sent_this_month) }} / {{ fmtNum(usage.monthly_send_limit) }}</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-white-light dark:bg-[#1b2e4b]">
            <div class="h-full rounded-full" :class="sendPct >= 90 ? 'bg-danger' : sendPct >= 75 ? 'bg-warning' : 'bg-primary'" :style="{ width: sendPct + '%' }" />
          </div>
        </div>
        <div>
          <div class="flex items-baseline justify-between text-sm">
            <span class="text-white-dark">Receiving this month</span>
            <span class="font-semibold dark:text-white-light">{{ fmtNum(usage.received_this_month) }}</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-white-light dark:bg-[#1b2e4b]">
            <div class="h-full rounded-full bg-info" :style="{ width: (usage.received_this_month > 0 ? 100 : 0) + '%', opacity: 0.4 }" />
          </div>
          <p class="mt-1 text-[11px] text-white-dark">Inbound mail · no cap</p>
        </div>
        <div>
          <div class="flex items-baseline justify-between text-sm">
            <span class="text-white-dark">Domains registered</span>
            <span class="font-semibold dark:text-white-light">{{ fmtNum(usage.domains) }} / {{ fmtNum(usage.domain_limit) }}</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-white-light dark:bg-[#1b2e4b]">
            <div class="h-full rounded-full" :class="domainPct >= 90 ? 'bg-danger' : domainPct >= 75 ? 'bg-warning' : 'bg-success'" :style="{ width: domainPct + '%' }" />
          </div>
        </div>
      </div>
      <p class="mt-3 text-[11px] text-white-dark">
        Send/receive counts are measured from Orb's own data and never decrease when messages are deleted. Limits are configured (Resend has no usage API).
      </p>
    </div>

    <div class="panel">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <input
            v-model="search"
            type="text"
            placeholder="Search by name or slug…"
            class="form-input ltr:pl-9 rtl:pr-9"
          >
          <span class="absolute top-1/2 -translate-y-1/2 text-white-dark ltr:left-3 rtl:right-3">
            <icon-search class="h-4 w-4" />
          </span>
        </div>
        <select v-model="status" class="form-select w-auto">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div v-if="error" class="rounded border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        {{ error }}
      </div>

      <div v-else class="datatable">
        <Vue3Datatable
          :rows="orgs"
          :columns="cols"
          :total-rows="total"
          :is-server-mode="true"
          :page-size="PER_PAGE"
          :sort-column="sortCol"
          :sort-direction="sortDir"
          :loading="loading"
          :sortable="true"
          skin="whitespace-nowrap bh-table-hover"
          no-data-content="No organizations found."
          @change="onTableChange"
        >
          <template #name="row">
            <NuxtLink :to="`/platform/orgs/${row.value.id}`" class="flex items-center gap-2 font-semibold text-primary hover:underline">
              {{ row.value.name }}
              <span v-if="row.value.is_system" class="badge bg-warning">System</span>
            </NuxtLink>
          </template>
          <template #slug="row">
            <span class="font-mono text-xs text-white-dark">{{ row.value.slug }}</span>
          </template>
          <template #plan="row">
            <span :class="planBadge[row.value.plan] || 'badge bg-secondary'" class="capitalize">{{ row.value.plan }}</span>
          </template>
          <template #enforce_2fa="row">
            <span v-if="row.value.enforce_2fa" class="badge bg-success">Enforced</span>
            <span v-else class="text-white-dark">&mdash;</span>
          </template>
          <template #suspended="row">
            <span v-if="row.value.suspended" class="badge bg-danger">Suspended</span>
            <span v-else class="badge bg-success">Active</span>
          </template>
          <template #created_at="row">
            <span class="text-white-dark">{{ fmtDate(row.value.created_at) }}</span>
          </template>
          <template #actions="row">
            <div class="text-center">
              <template v-if="!row.value.is_system">
                <button
                  v-if="!row.value.suspended"
                  type="button"
                  class="btn btn-danger btn-sm"
                  :disabled="busyId === row.value.id"
                  @click="onSuspend(row.value)"
                >
                  Suspend
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-success btn-sm"
                  :disabled="busyId === row.value.id"
                  @click="onUnsuspend(row.value)"
                >
                  Unsuspend
                </button>
              </template>
              <span v-else class="text-xs text-white-dark">&mdash;</span>
            </div>
          </template>
        </Vue3Datatable>
      </div>

    </div>
  </div>
</template>
