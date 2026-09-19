<script setup lang="ts">
import type { PlanUpdate, PlatformPlan } from '~/composables/usePlatformPlans'

definePageMeta({ layout: 'platform' })
useHead({ title: 'Pricing plans' })

const toast = useToast()
const { pUser } = usePlatform()
const { listPlans, updatePlan } = usePlatformPlans()

const isSuperAdmin = computed(() => pUser.value?.role === 'platform:super_admin')

const { data: plans, pending, error, refresh } = await useAsyncData(
  'platform-plans',
  () => (isSuperAdmin.value ? listPlans() : Promise.resolve([] as PlatformPlan[])),
)

// These limit fields use -1 to mean "Unlimited" (not null).
function fmtLimit(n: number): string {
  return n === -1 ? 'Unlimited' : new Intl.NumberFormat().format(n)
}

const planBadge: Record<string, string> = {
  free: 'badge bg-secondary',
  startup: 'badge bg-info',
  business: 'badge bg-primary',
  enterprise: 'badge bg-dark',
}

// ── Edit modal ────────────────────────────────────────────────────────
interface EditForm {
  label: string
  tagline: string
  monthly_bdt: number
  yearly_bdt: number
  emails_per_month: number
  users: number
  domains: number
  webhooks: number
  retention_days: number
  attachments_over_2m: boolean
  analytics: string
  active: boolean
}

const editOpen = ref(false)
const editingKey = ref('')
const saving = ref(false)
const form = ref<EditForm | null>(null)

function openEdit(p: PlatformPlan) {
  editingKey.value = p.key
  form.value = {
    label: p.label,
    tagline: p.tagline,
    monthly_bdt: Math.round(p.monthly_price_paisa / 100),
    yearly_bdt: Math.round(p.yearly_price_paisa / 100),
    emails_per_month: p.emails_per_month,
    users: p.users,
    domains: p.domains,
    webhooks: p.webhooks,
    retention_days: p.retention_days,
    attachments_over_2m: p.attachments_over_2m,
    analytics: p.analytics,
    active: p.active,
  }
  editOpen.value = true
}

function closeEdit() {
  editOpen.value = false
  form.value = null
}

async function onSave() {
  if (!form.value || saving.value)
    return
  const f = form.value
  const body: PlanUpdate = {
    label: f.label,
    tagline: f.tagline,
    monthly_price_paisa: Math.round(f.monthly_bdt * 100),
    yearly_price_paisa: Math.round(f.yearly_bdt * 100),
    emails_per_month: Number(f.emails_per_month),
    users: Number(f.users),
    domains: Number(f.domains),
    webhooks: Number(f.webhooks),
    retention_days: Number(f.retention_days),
    attachments_over_2m: f.attachments_over_2m,
    analytics: f.analytics,
    active: f.active,
  }
  saving.value = true
  try {
    await updatePlan(editingKey.value, body)
    toast.success('Plan updated')
    closeEdit()
    await refresh()
  }
  catch (e) {
    toast.error(errMsg(e, 'Failed to update plan'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-dark dark:text-white-light">Pricing plans</h1>
      <button
        v-if="isSuperAdmin"
        type="button"
        class="btn btn-outline-primary btn-sm gap-2"
        :disabled="pending"
        @click="refresh"
      >
        <icon-refresh class="h-4 w-4" :class="pending ? 'animate-spin' : ''" />
        Refresh
      </button>
    </div>

    <!-- Super-admin gate -->
    <div v-if="!isSuperAdmin" class="panel text-center text-white-dark">
      <div class="py-10">
        <div class="text-lg font-semibold text-dark dark:text-white-light">Super-admins only</div>
        <p class="mt-1 text-sm">Editing the base pricing plans is restricted to platform super-admins.</p>
      </div>
    </div>

    <template v-else>
      <div class="panel border border-primary/30 bg-primary-light text-sm dark:bg-primary/10">
        Edits apply immediately to quota + the public pricing page.
      </div>

      <div v-if="error" class="panel border border-danger/40 text-sm text-danger">
        {{ errMsg(error, 'Failed to load plans') }}
      </div>

      <div v-else-if="pending && !plans?.length" class="panel text-center text-white-dark">
        Loading…
      </div>

      <div v-else class="panel p-0">
        <div class="table-responsive">
          <table class="table-hover whitespace-nowrap">
            <thead>
              <tr>
                <th>Plan</th>
                <th class="text-right">Monthly</th>
                <th class="text-right">Yearly</th>
                <th class="text-right">Emails / mo</th>
                <th class="text-right">Users</th>
                <th class="text-right">Domains</th>
                <th class="text-right">Webhooks</th>
                <th class="text-right">Retention</th>
                <th>Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in plans" :key="p.key">
                <td>
                  <div class="flex items-center gap-2">
                    <span :class="planBadge[p.key] || 'badge bg-secondary'">{{ p.label }}</span>
                  </div>
                  <div class="mt-1 max-w-xs whitespace-normal text-xs text-white-dark">{{ p.tagline }}</div>
                </td>
                <td class="text-right tabular-nums">{{ formatPaisaBDT(p.monthly_price_paisa) }}</td>
                <td class="text-right tabular-nums">{{ formatPaisaBDT(p.yearly_price_paisa) }}</td>
                <td class="text-right tabular-nums">{{ fmtLimit(p.emails_per_month) }}</td>
                <td class="text-right tabular-nums">{{ fmtLimit(p.users) }}</td>
                <td class="text-right tabular-nums">{{ fmtLimit(p.domains) }}</td>
                <td class="text-right tabular-nums">{{ fmtLimit(p.webhooks) }}</td>
                <td class="text-right tabular-nums">{{ fmtLimit(p.retention_days) }} days</td>
                <td>
                  <span v-if="p.active" class="badge bg-success">Active</span>
                  <span v-else class="badge bg-secondary">Hidden</span>
                </td>
                <td class="text-center">
                  <button type="button" class="btn btn-outline-primary btn-sm" @click="openEdit(p)">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Edit modal -->
    <div v-if="editOpen && form" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
      <div class="panel w-full max-w-lg overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] py-3 px-5 dark:bg-[#121c2c]">
          <h5 class="text-lg font-bold capitalize dark:text-white-light">Edit {{ editingKey }} plan</h5>
          <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="closeEdit">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="onSave">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block font-semibold">Label</label>
              <input v-model="form.label" type="text" class="form-input" required />
            </div>
            <div>
              <label class="mb-1.5 block font-semibold">Analytics</label>
              <input v-model="form.analytics" type="text" class="form-input" />
            </div>
          </div>
          <div>
            <label class="mb-1.5 block font-semibold">Tagline</label>
            <input v-model="form.tagline" type="text" class="form-input" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block font-semibold">Monthly price (৳)</label>
              <input v-model.number="form.monthly_bdt" type="number" min="0" step="1" class="form-input" />
            </div>
            <div>
              <label class="mb-1.5 block font-semibold">Yearly price (৳)</label>
              <input v-model.number="form.yearly_bdt" type="number" min="0" step="1" class="form-input" />
            </div>
          </div>

          <p class="text-xs text-white-dark">Limits below are plain numbers. Use <code class="font-mono">-1</code> for unlimited.</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block font-semibold">Emails / month</label>
              <input v-model.number="form.emails_per_month" type="number" step="1" class="form-input" />
            </div>
            <div>
              <label class="mb-1.5 block font-semibold">Users</label>
              <input v-model.number="form.users" type="number" step="1" class="form-input" />
            </div>
            <div>
              <label class="mb-1.5 block font-semibold">Domains</label>
              <input v-model.number="form.domains" type="number" step="1" class="form-input" />
            </div>
            <div>
              <label class="mb-1.5 block font-semibold">Webhooks</label>
              <input v-model.number="form.webhooks" type="number" step="1" class="form-input" />
            </div>
            <div>
              <label class="mb-1.5 block font-semibold">Retention (days)</label>
              <input v-model.number="form.retention_days" type="number" step="1" class="form-input" />
            </div>
          </div>

          <div class="flex flex-wrap gap-6">
            <label class="inline-flex cursor-pointer items-center gap-2">
              <input v-model="form.attachments_over_2m" type="checkbox" class="form-checkbox" />
              <span>Attachments over 2 MB</span>
            </label>
            <label class="inline-flex cursor-pointer items-center gap-2">
              <input v-model="form.active" type="checkbox" class="form-checkbox" />
              <span>Active (shown publicly)</span>
            </label>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="btn btn-outline-primary" @click="closeEdit">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving…' : 'Save plan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
