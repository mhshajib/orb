<script setup lang="ts">
import type { BillingCycle, OrgPlan } from '@/composables/useBilling'

useHead({ title: 'Billing' })

const { user } = useAuth()
const { success, error: toastError, confirm } = useToast()
const isOwner = computed(() => user.value?.role === 'owner')

const { plans, orderedPlans } = usePlans()

const { data: subscription, pending: subPending, error: subError, refresh: refreshSub } = await useAsyncData(
  'billing-sub',
  () => getSubscription(),
)

const invoicePage = ref(1)
const perPage = 10
const { data: invoices, pending: invPending, error: invError, refresh: refreshInvoices } = await useAsyncData(
  'billing-invoices',
  () => listInvoices({ limit: perPage, offset: (invoicePage.value - 1) * perPage }),
  { watch: [invoicePage] },
)

const cycle = ref<BillingCycle>(subscription.value?.cycle ?? 'monthly')
const yearly = computed({
  get: () => cycle.value === 'yearly',
  set: (v: boolean) => { cycle.value = v ? 'yearly' : 'monthly' },
})

const currentPlan = computed<OrgPlan>(() => subscription.value?.plan ?? 'free')
function isCurrentPlan(p: OrgPlan) {
  return currentPlan.value === p
}

// ---------- Subscribe flow ----------
const confirmOpen = ref(false)
const confirmPlan = ref<OrgPlan | null>(null)
const submitting = ref(false)

function openConfirm(plan: OrgPlan) {
  if (!isOwner.value) {
    toastError('Only the org owner can change billing.')
    return
  }
  // Free is self-serve (instant). Paid + Enterprise are request-to-upgrade for
  // now — online payment (bKash) isn't live yet, so our team activates your plan
  // manually after you reach out.
  if (plan !== 'free') {
    const subject = encodeURIComponent(`Upgrade request: ${plans.value[plan]?.label ?? plan} (${cycle.value})`)
    const body = encodeURIComponent(`Hi Orb team,\n\nWe'd like to upgrade to the ${plans.value[plan]?.label ?? plan} plan (${cycle.value} billing).\n\nThanks.`)
    window.location.href = `mailto:sales@orb.bd?subject=${subject}&body=${body}`
    return
  }
  confirmPlan.value = plan
  confirmOpen.value = true
}

async function onConfirm() {
  if (!confirmPlan.value || submitting.value) return
  submitting.value = true
  try {
    const res = await subscribe({ plan: confirmPlan.value, cycle: cycle.value, provider: 'bkash' })
    if (res.redirect_url) {
      // bKash flow — top-level navigation to the payment gateway.
      window.location.href = res.redirect_url
      return
    }
    // Free plan activates immediately.
    confirmOpen.value = false
    success(`Switched to ${plans.value[confirmPlan.value].label}.`)
    await refreshSub()
  }
  catch (e) {
    toastError(errMsg(e, 'Could not subscribe'))
  }
  finally {
    submitting.value = false
  }
}

// ---------- Cancel flow ----------
const cancelling = ref(false)
async function onCancel() {
  if (cancelling.value || !subscription.value) return
  const ok = await confirm({
    title: 'Cancel your subscription?',
    text: `Your current plan stays active until ${fmtDate(subscription.value.current_period_end)}. After that you'll drop back to Free.`,
    confirmText: 'Cancel subscription',
    danger: true,
  })
  if (!ok) return
  cancelling.value = true
  try {
    await cancelSubscription()
    success('Subscription will end at the close of the current period.')
    await refreshSub()
  }
  catch (e) {
    toastError(errMsg(e, 'Could not cancel'))
  }
  finally {
    cancelling.value = false
  }
}

// ---------- Plan-card helpers ----------
function actionLabel(p: OrgPlan): string {
  if (isCurrentPlan(p)) return 'Current plan'
  if (p === 'enterprise') return 'Contact sales'
  if (p === 'free') return 'Switch to free'
  return 'Request upgrade'
}

function priceFor(p: OrgPlan): string {
  const limits = plans.value[p]
  if (p === 'enterprise') return 'Custom'
  const amount = cycle.value === 'monthly' ? limits.monthlyBDT : limits.yearlyBDT
  return amount === 0 ? 'Free' : formatTakaBDT(amount ?? 0)
}

function priceSuffix(p: OrgPlan): string {
  if (p === 'enterprise') return ''
  const limits = plans.value[p]
  const amount = cycle.value === 'monthly' ? limits.monthlyBDT : limits.yearlyBDT
  if (amount === 0) return ''
  return cycle.value === 'monthly' ? '/ mo' : '/ yr'
}

// ---------- Display helpers ----------
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const subStatusBadge: Record<string, string> = {
  active: 'badge-outline-success',
  trialing: 'badge-outline-info',
  past_due: 'badge-outline-warning',
  cancelled: 'badge-outline-danger',
}

const invoiceStatusBadge: Record<string, { cls: string, label: string }> = {
  paid: { cls: 'badge-outline-success', label: 'Paid' },
  pending: { cls: 'badge-outline-warning', label: 'Pending' },
  failed: { cls: 'badge-outline-danger', label: 'Failed' },
  refunded: { cls: 'badge-outline-secondary', label: 'Refunded' },
  cancelled: { cls: 'badge-outline-secondary', label: 'Cancelled' },
}
</script>

<template>
  <div>
    <ul class="flex space-x-2 rtl:space-x-reverse">
      <li>
        <NuxtLink to="/app" class="text-primary hover:underline">Dashboard</NuxtLink>
      </li>
      <li class="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
        <span>Billing</span>
      </li>
    </ul>

    <div class="space-y-6 pt-5">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-semibold dark:text-white-light">Billing</h2>
        <p class="mt-1 text-sm text-white-dark">
          Plans, invoices, and payment receipts.
          <span v-if="!isOwner" class="text-warning">Only the org owner can change billing.</span>
        </p>
      </div>

      <!-- Current subscription -->
      <div class="panel overflow-hidden border-0 p-0">
        <div class="border-b border-[#e0e6ed] p-5 dark:border-[#1b2e4b]">
          <h5 class="text-lg font-semibold dark:text-white-light">Current subscription</h5>
        </div>

        <div class="p-5">
          <div v-if="subPending && !subscription && !subError" class="flex items-center gap-2 text-sm text-white-dark">
            <icon-loader class="h-5 w-5 animate-spin" /> Loading…
          </div>

          <div v-else-if="subError" class="flex items-center gap-2 rounded border border-danger/40 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
            <icon-info-triangle class="h-5 w-5 shrink-0" />
            {{ errMsg(subError, 'Could not load subscription') }}
          </div>

          <template v-else-if="subscription">
            <div class="flex flex-wrap items-center gap-5">
              <div class="grid h-16 w-16 shrink-0 place-content-center rounded-2xl bg-primary/10 text-primary">
                <icon-credit-card class="h-8 w-8" />
              </div>
              <div class="flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-2xl font-bold capitalize text-dark dark:text-white-light">{{ plans[subscription.plan]?.label ?? subscription.plan }}</span>
                  <span class="badge capitalize" :class="subStatusBadge[subscription.status] ?? 'badge-outline-secondary'">
                    {{ subscription.status.replace('_', ' ') }}
                  </span>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-x-2 text-sm capitalize text-white-dark">
                  <span>{{ subscription.cycle }} billing</span>
                  <span v-if="subscription.cancel_at_period_end" class="text-warning normal-case">
                    · ends {{ fmtDate(subscription.current_period_end) }}
                  </span>
                </div>
              </div>
              <div class="rounded-lg bg-[#fbfbfb] px-4 py-3 text-sm dark:bg-[#121c2c]">
                <div class="flex items-center gap-1.5 text-white-dark">
                  <icon-calendar class="h-4 w-4" />
                  {{ subscription.cancel_at_period_end ? 'Ends on' : 'Renews on' }}
                </div>
                <div class="mt-0.5 font-semibold text-dark dark:text-white-light">{{ fmtDate(subscription.current_period_end) }}</div>
              </div>
            </div>

            <div v-if="subscription.plan !== 'free' && !subscription.cancel_at_period_end" class="mt-5 border-t border-[#e0e6ed] pt-4 dark:border-[#1b2e4b]">
              <button type="button" class="btn btn-outline-danger btn-sm gap-2" :disabled="!isOwner || cancelling" @click="onCancel">
                <icon-loader v-if="cancelling" class="h-4 w-4 animate-spin" />
                {{ cancelling ? 'Cancelling…' : 'Cancel subscription' }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="flex items-center gap-4">
              <div class="grid h-16 w-16 shrink-0 place-content-center rounded-2xl bg-primary/10 text-primary">
                <icon-credit-card class="h-8 w-8" />
              </div>
              <div class="text-sm text-white-dark">
                You're on the <span class="font-semibold text-dark dark:text-white-light">Free</span> plan.
                Pick a paid plan below to start sending more.
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Plans -->
      <div class="panel">
        <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h5 class="text-lg font-semibold dark:text-white-light">Plans</h5>
          <div class="flex items-center gap-3 text-sm font-semibold">
            <span :class="!yearly ? 'text-primary' : 'text-white-dark'">Monthly</span>
            <label class="relative h-6 w-12">
              <input v-model="yearly" type="checkbox" class="custom_switch peer absolute top-0 z-10 h-full w-full cursor-pointer opacity-0 ltr:left-0 rtl:right-0">
              <span class="block h-full rounded-full border-2 border-[#ebedf2] bg-white before:absolute before:bottom-1 before:h-4 before:w-4 before:rounded-full before:bg-[#ebedf2] before:transition-all before:duration-300 peer-checked:border-primary peer-checked:before:left-7 peer-checked:before:bg-primary ltr:before:left-1 rtl:before:right-1 dark:border-white-dark dark:bg-dark dark:before:bg-white-dark" />
            </label>
            <span :class="yearly ? 'text-primary' : 'text-white-dark'">
              Yearly <span class="badge bg-success ltr:ml-1 rtl:mr-1">Save 2 months</span>
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="p in orderedPlans"
            :key="p"
            class="group relative flex flex-col rounded-md border p-6 transition-all duration-300 hover:shadow-[0_0_15px_1px_rgba(113,106,202,0.20)]"
            :class="isCurrentPlan(p)
              ? 'border-primary shadow-[0_0_15px_1px_rgba(113,106,202,0.20)] dark:border-primary'
              : 'border-[#e0e6ed] dark:border-[#1b2e4b]'"
          >
            <!-- Current badge -->
            <div
              v-if="isCurrentPlan(p)"
              class="absolute inset-x-0 -top-3 mx-auto flex h-7 w-max items-center gap-1 rounded-full bg-primary px-4 text-xs font-semibold text-white"
            >
              <icon-circle-check class="h-3.5 w-3.5" /> Current plan
            </div>

            <h3 class="text-xl font-semibold capitalize text-dark dark:text-white-light">{{ plans[p].label }}</h3>
            <p class="mt-1 min-h-[2.75rem] text-[13px] text-white-dark">{{ plans[p].tagline }}</p>

            <div class="my-6 flex items-end gap-1">
              <span class="text-4xl font-bold text-[#3b3f5c] group-hover:text-primary dark:text-white-light">{{ priceFor(p) }}</span>
              <span class="pb-1 text-sm text-white-dark"> {{ priceSuffix(p) }}</span>
            </div>

            <ul class="mb-6 flex-1 space-y-3 text-sm">
              <li class="flex items-center gap-2.5 text-dark dark:text-white-dark">
                <icon-circle-check class="h-4 w-4 shrink-0 text-primary" />
                {{ formatQuota(plans[p].emails) }} emails/mo
              </li>
              <li class="flex items-center gap-2.5 text-dark dark:text-white-dark">
                <icon-circle-check class="h-4 w-4 shrink-0 text-primary" />
                {{ formatQuota(plans[p].users) }} users
              </li>
              <li class="flex items-center gap-2.5 text-dark dark:text-white-dark">
                <icon-circle-check class="h-4 w-4 shrink-0 text-primary" />
                {{ formatDomains(plans[p].domains) }}
              </li>
              <li class="flex items-center gap-2.5 text-dark dark:text-white-dark">
                <icon-circle-check class="h-4 w-4 shrink-0 text-primary" />
                {{ formatQuota(plans[p].webhooks) }} webhooks
              </li>
              <li class="flex items-center gap-2.5 text-dark dark:text-white-dark">
                <icon-circle-check class="h-4 w-4 shrink-0 text-primary" />
                <span v-if="plans[p].retentionDays != null">{{ plans[p].retentionDays }} day retention</span>
                <span v-else>Custom retention</span>
              </li>
            </ul>

            <button
              type="button"
              class="btn w-full"
              :class="isCurrentPlan(p) ? 'btn-outline-primary' : 'btn-primary'"
              :disabled="isCurrentPlan(p) || (p !== 'enterprise' && !isOwner)"
              @click="openConfirm(p)"
            >
              {{ actionLabel(p) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Invoices -->
      <div class="panel overflow-hidden border-0 p-0">
        <div class="flex items-center gap-2 border-b border-[#e0e6ed] p-5 dark:border-[#1b2e4b]">
          <h5 class="text-lg font-semibold dark:text-white-light">Invoices</h5>
          <span v-if="invoices?.meta?.total" class="badge badge-outline-primary">{{ invoices.meta.total }}</span>
        </div>

        <div v-if="invPending && !invoices" class="flex items-center justify-center gap-2 p-12 text-white-dark">
          <icon-loader class="h-5 w-5 animate-spin" /> Loading invoices…
        </div>

        <div v-else-if="invError" class="m-5 flex items-center gap-2 rounded border border-danger/40 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
          <icon-info-triangle class="h-5 w-5 shrink-0" />
          {{ errMsg(invError, 'Could not load invoices') }}
        </div>

        <div v-else-if="!invoices?.items?.length" class="flex flex-col items-center gap-3 py-14 text-center">
          <div class="grid h-14 w-14 place-content-center rounded-2xl bg-primary/10 text-primary">
            <icon-clipboard-text class="h-7 w-7" />
          </div>
          <div class="text-sm text-white-dark">No invoices yet.</div>
        </div>

        <div v-else class="table-responsive">
          <table class="table-hover whitespace-nowrap">
            <thead>
              <tr>
                <th>Date</th>
                <th>Plan</th>
                <th>Cycle</th>
                <th class="ltr:text-right rtl:text-left">Amount</th>
                <th>Status</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in invoices.items" :key="inv.id">
                <td class="text-white-dark">{{ fmtDate(inv.paid_at ?? inv.created_at) }}</td>
                <td class="font-semibold capitalize text-dark dark:text-white-light">{{ plans[inv.plan]?.label ?? inv.plan }}</td>
                <td class="capitalize text-white-dark">{{ inv.cycle }}</td>
                <td class="font-semibold ltr:text-right rtl:text-left">{{ formatPaisaBDT(inv.amount) }}</td>
                <td>
                  <span class="badge" :class="invoiceStatusBadge[inv.status]?.cls ?? 'badge-outline-secondary'">
                    {{ invoiceStatusBadge[inv.status]?.label ?? inv.status }}
                  </span>
                </td>
                <td class="max-w-[24ch] truncate font-mono text-xs text-white-dark">
                  {{ inv.transaction_id || inv.payment_ref || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="invoices && invoices.meta.pages > 1" class="flex items-center justify-between border-t border-[#e0e6ed] p-4 text-sm text-white-dark dark:border-[#1b2e4b]">
          <div>Page {{ invoices.meta.page }} of {{ invoices.meta.pages }} — {{ invoices.meta.total }} total</div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-outline-primary btn-sm" :disabled="invoicePage <= 1" @click="invoicePage--">Prev</button>
            <button type="button" class="btn btn-outline-primary btn-sm" :disabled="invoicePage >= invoices.meta.pages" @click="invoicePage++">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Subscribe confirm modal -->
    <div v-if="confirmOpen && confirmPlan" class="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
      <div class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] px-5 py-3.5 dark:bg-[#121c2c]">
          <h5 class="text-lg font-semibold dark:text-white-light">
            {{ confirmPlan === 'free' ? 'Switch to Free?' : `Subscribe to ${plans[confirmPlan].label}` }}
          </h5>
          <button type="button" class="text-white-dark outline-none hover:text-danger" @click="confirmOpen = false">
            <icon-x class="h-5 w-5" />
          </button>
        </div>

        <div class="p-5">
          <div class="mb-5 text-sm text-white-dark">
            <template v-if="confirmPlan === 'free'">
              Your current plan ends and you'll move to the Free quotas immediately.
              <span v-if="(plans[currentPlan]?.users ?? 0) > (plans.free.users ?? 0)" class="mt-2 flex items-center gap-1.5 text-warning">
                <icon-info-triangle class="h-4 w-4 shrink-0" />
                Heads up: any usage above Free's caps will get gated.
              </span>
            </template>
            <template v-else>
              <div class="mb-4 flex items-center justify-between rounded-lg bg-[#fbfbfb] p-4 dark:bg-[#121c2c]">
                <span class="font-semibold text-dark dark:text-white-light">{{ plans[confirmPlan].label }} ({{ cycle }})</span>
                <span class="text-lg font-bold text-primary">{{ priceFor(confirmPlan) }} {{ priceSuffix(confirmPlan) }}</span>
              </div>
              You'll be redirected to bKash to complete payment. After payment we'll bring you back to the result page.
            </template>
          </div>

          <div class="flex justify-end gap-3">
            <button type="button" class="btn btn-outline-danger" :disabled="submitting" @click="confirmOpen = false">Cancel</button>
            <button type="button" class="btn btn-primary gap-2" :disabled="submitting" @click="onConfirm">
              <icon-loader v-if="submitting" class="h-4 w-4 animate-spin" />
              {{ submitting ? 'Working…' : (confirmPlan === 'free' ? 'Switch plan' : 'Continue to payment') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
