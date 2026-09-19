<script lang="ts" setup>
import type { OrgStats } from '@/composables/useOrg'
import IconGlobe from '@/components/icon/icon-globe.vue'
import IconUsers from '@/components/icon/icon-users.vue'
import IconSend from '@/components/icon/icon-send.vue'
import IconInbox from '@/components/icon/icon-inbox.vue'
import IconMail from '@/components/icon/icon-mail.vue'
import IconLockDots from '@/components/icon/icon-lock-dots.vue'

useHead({ title: 'Dashboard' })

const org = useOrg()
const { user } = useAuth()
const { displayName } = useSelf()

const isManager = computed(() => user.value?.role === 'owner' || user.value?.role === 'admin')
const sharedDomain = (useRuntimeConfig().public.sharedSendingDomain as string) || 'send.orb.bd'
const isFree = computed(() => (org.value?.plan ?? 'free') === 'free')
// Caps the backend actually enforces: the org's negotiated override where set,
// otherwise its plan.
const { plans } = usePlans()
const { limits: effectiveLimits, isCustomised, showsComparison, customCapChanges, limitRows } = useEffectiveLimits()
const planLabel = computed(() => plans.value[org.value?.plan ?? 'free']?.label ?? (org.value?.plan ?? 'free'))
const sharedSender = computed(() => (org.value?.slug ? `${org.value.slug}@${sharedDomain}` : ''))

// Org stats power every counter on the dashboard. Best-effort: a failure
// shouldn't blank the whole page, so we default to a zeroed shape.
// The get-started hint used to key off total_sent, so anyone who had made a key
// but not sent yet was told to "Create an API key" forever. Ask whether a key
// actually exists. Best-effort: a failure here must not blank the dashboard.
const { data: apiKeys } = await useAsyncData('app-dashboard-keys', () => listApiKeys().catch(() => []), {
  default: () => [],
})
const hasApiKey = computed(() => (apiKeys.value?.length ?? 0) > 0)

// Org-wide totals are owner/admin only. fetchOrgStats() swallows the error, so
// a member wouldn't break - they'd just fire a 403 on every dashboard load and
// render a row of zeroes. Don't ask.
const { data: stats, pending } = await useAsyncData<OrgStats | null>(
  'app-dashboard-stats',
  () => (isManager.value ? fetchOrgStats() : Promise.resolve(null)),
  { default: () => null },
)

// Make sure the org is loaded if settings/dashboard is the first /app/* route hit.
if (!org.value) await fetchOrg()

// Realtime: keep counters live without a full refetch.
const realtime = useRealtime()
realtime.useOn('new_email', (email) => {
  if (!stats.value) return
  if (email.direction === 'inbound') stats.value.total_received += 1
  else { stats.value.total_sent += 1; stats.value.emails_this_period += 1 }
})
realtime.useOn('stats_update', (s) => {
  if (!stats.value) return
  stats.value.total_domains = s.total_domains
  stats.value.total_users = s.total_users
  stats.value.total_sent = s.total_sent
  stats.value.total_received = s.total_received
})

const firstName = computed(() => (displayName.value ? displayName.value.split(/\s+/)[0] : ''))

function fmt(n: number) {
  return new Intl.NumberFormat().format(n)
}

interface StatCard {
  label: string
  value: () => number
  icon: any
  tone: string // success | info | primary | warning
}
const cards: StatCard[] = [
  { label: 'Domains', value: () => stats.value?.total_domains ?? 0, icon: IconGlobe, tone: 'success' },
  { label: 'Team members', value: () => stats.value?.total_users ?? 0, icon: IconUsers, tone: 'info' },
  { label: 'Emails sent', value: () => stats.value?.total_sent ?? 0, icon: IconSend, tone: 'primary' },
  { label: 'Emails received', value: () => stats.value?.total_received ?? 0, icon: IconInbox, tone: 'warning' },
]

interface QuickLink {
  label: string
  desc: string
  to: string
  icon: any
  tone: string
  managerOnly?: boolean
}
const quickLinks: QuickLink[] = [
  { label: 'Emails', desc: 'Browse sent & received mail', to: '/app/emails', icon: IconMail, tone: 'primary' },
  { label: 'Domains', desc: 'Add & verify sending domains', to: '/app/domains', icon: IconGlobe, tone: 'success', managerOnly: true },
  { label: 'API keys', desc: 'Credentials for the REST API', to: '/app/api-keys', icon: IconLockDots, tone: 'warning', managerOnly: true },
]
const visibleLinks = computed(() => quickLinks.filter(l => !l.managerOnly || isManager.value))

// Plan usage — current counts (from org stats) against the plan caps. Only
// metrics that are genuinely "current vs limit" are shown.
interface UsageRow {
  label: string
  used: number
  capLabel: string
  pct: number
  near: boolean
}
const usage = computed<UsageRow[]>(() => {
  // Effective limits, not the static PLAN_LIMITS table: an org with negotiated
  // caps must see its real quota here, the same numbers the backend enforces.
  const limits = effectiveLimits.value
  function row(label: string, used: number, cap: number | null): UsageRow {
    const unlimited = cap == null
    const pct = unlimited
      ? (used > 0 ? 6 : 0)
      : (cap === 0 ? 0 : Math.min(100, Math.round((used / cap) * 100)))
    return { label, used, capLabel: formatQuota(cap), pct, near: !unlimited && pct >= 90 }
  }
  const rows = [row('Emails this period', stats.value?.emails_this_period ?? 0, limits.emails)]
  // Free orgs send from the shared domain — no custom-domain quota to show.
  if (!isFree.value) rows.push(row('Domains', stats.value?.total_domains ?? 0, limits.domains))
  rows.push(row('Team members', stats.value?.total_users ?? 0, limits.users))
  return rows
})

// Lightweight onboarding hints — surface the next sensible action.
const hints = computed(() => {
  const out: { text: string, to: string, cta: string }[] = []
  if (!isManager.value) return out
  if (isFree.value)
    out.push({ text: `You're set up to send from ${sharedSender.value} on the free plan. Add your own domain anytime.`, to: '/app/billing', cta: 'View plans' })
  else if ((stats.value?.total_domains ?? 0) === 0)
    out.push({ text: 'Add and verify a sending domain to start sending mail.', to: '/app/domains', cta: 'Add domain' })
  if ((stats.value?.total_users ?? 0) <= 1)
    out.push({ text: 'Invite your teammates to collaborate in this workspace.', to: '/app/users', cta: 'Invite team' })
  if ((stats.value?.total_sent ?? 0) === 0) {
    // Two different situations, two different next actions.
    if (!hasApiKey.value)
      out.push({ text: 'Create an API key to send your first email programmatically.', to: '/app/api-keys', cta: 'Create key' })
    else
      out.push({ text: 'You have an API key — send your first email with a copy-paste example.', to: '/app/developers', cta: 'View docs' })
  }
  return out
})
</script>

<template>
    <div>
        <!-- Breadcrumb -->
        <ul class="flex space-x-2 rtl:space-x-reverse">
            <li>
                <NuxtLink to="/app" class="text-primary hover:underline">Home</NuxtLink>
            </li>
            <li class="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                <span>Dashboard</span>
            </li>
        </ul>

        <div class="pt-5 space-y-6">
            <!-- Welcome panel -->
            <div class="panel overflow-hidden bg-primary text-white">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-semibold">
                            Welcome back<template v-if="firstName">, {{ firstName }}</template> 👋
                        </h2>
                        <p class="mt-1 text-white-light/90">
                            Here's what's happening across
                            <span class="font-semibold">{{ org?.name ?? 'your organization' }}</span> right now.
                        </p>
                        <div class="mt-3 flex items-center gap-2 text-sm">
                            <span class="badge bg-white/20 capitalize">{{ org?.plan ?? 'free' }} plan</span>
                            <span v-if="org?.slug" class="font-mono text-white-light/80">{{ org.slug }}</span>
                        </div>
                    </div>
                    <NuxtLink to="/app/emails" class="btn bg-white text-primary hover:bg-white/90 border-0 gap-2">
                        <icon-mail class="h-4 w-4" /> View emails
                    </NuxtLink>
                </div>
            </div>

            <!-- Stat cards. Org-wide counts, so manager-only - see the stats
                 fetch above. -->
            <div v-if="isManager" class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <div v-for="card in cards" :key="card.label" class="panel">
                    <div class="flex items-center justify-between">
                        <div
                            class="grid h-12 w-12 place-content-center rounded-xl"
                            :class="{
                                'bg-success-light text-success dark:bg-success dark:text-success-light': card.tone === 'success',
                                'bg-info-light text-info dark:bg-info dark:text-info-light': card.tone === 'info',
                                'bg-primary-light text-primary dark:bg-primary dark:text-primary-light': card.tone === 'primary',
                                'bg-warning-light text-warning dark:bg-warning dark:text-warning-light': card.tone === 'warning',
                            }"
                        >
                            <component :is="card.icon" class="h-6 w-6" />
                        </div>
                        <div class="text-right">
                            <template v-if="pending && !stats">
                                <div class="h-8 w-16 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                            </template>
                            <h5 v-else class="text-3xl font-semibold dark:text-white-light">{{ fmt(card.value()) }}</h5>
                            <p class="text-sm text-white-dark">{{ card.label }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <!-- Quick links -->
                <div class="panel" :class="isManager ? 'lg:col-span-2' : 'lg:col-span-3'">
                    <div class="mb-5 flex items-center justify-between">
                        <h5 class="text-lg font-semibold dark:text-white-light">Quick links</h5>
                    </div>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <NuxtLink
                            v-for="l in visibleLinks"
                            :key="l.to"
                            :to="l.to"
                            class="group flex flex-col gap-3 rounded-lg border border-white-light p-4 transition hover:border-primary hover:shadow dark:border-[#1b2e4b]"
                        >
                            <div
                                class="grid h-11 w-11 place-content-center rounded-lg"
                                :class="{
                                    'bg-primary-light text-primary dark:bg-primary dark:text-primary-light': l.tone === 'primary',
                                    'bg-success-light text-success dark:bg-success dark:text-success-light': l.tone === 'success',
                                    'bg-warning-light text-warning dark:bg-warning dark:text-warning-light': l.tone === 'warning',
                                }"
                            >
                                <component :is="l.icon" class="h-5 w-5" />
                            </div>
                            <div>
                                <div class="flex items-center gap-1 font-semibold dark:text-white-light">
                                    {{ l.label }}
                                    <icon-arrow-forward class="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                                </div>
                                <p class="mt-0.5 text-xs text-white-dark">{{ l.desc }}</p>
                            </div>
                        </NuxtLink>
                    </div>

                    <!-- Onboarding hints -->
                    <div v-if="hints.length" class="mt-6 space-y-3">
                        <h6 class="text-sm font-semibold text-white-dark">Get started</h6>
                        <div
                            v-for="(h, i) in hints"
                            :key="i"
                            class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-light p-4 dark:bg-[#1b2e4b]"
                        >
                            <div class="flex items-center gap-3">
                                <icon-info-circle class="h-5 w-5 shrink-0 text-primary" />
                                <span class="text-sm dark:text-white-light">{{ h.text }}</span>
                            </div>
                            <NuxtLink :to="h.to" class="btn btn-primary btn-sm">{{ h.cta }}</NuxtLink>
                        </div>
                    </div>
                </div>

                <!-- Plan usage. Reads org-wide counts against the org's caps,
                     which is a management view - and its numbers come from the
                     stats call a member no longer makes. -->
                <div v-if="isManager" class="panel">
                    <div class="mb-5 flex items-center justify-between">
                        <h5 class="text-lg font-semibold dark:text-white-light">Plan usage</h5>
                        <div class="flex items-center gap-2">
                            <span class="badge badge-outline-primary capitalize">{{ org?.plan ?? 'free' }}</span>
                            <span v-if="isCustomised" class="badge inline-flex shrink-0 items-center gap-1 bg-primary">
                                <icon-star class="h-3.5 w-3.5" />
                                Custom
                            </span>
                        </div>
                    </div>
                    <div class="space-y-5">
                        <div v-for="u in usage" :key="u.label">
                            <div class="mb-1.5 flex items-center justify-between text-sm font-semibold">
                                <span class="text-white-dark">{{ u.label }}</span>
                                <span :class="u.near ? 'text-danger' : 'dark:text-white-light'">{{ fmt(u.used) }} / {{ u.capLabel }}</span>
                            </div>
                            <div class="h-2 rounded-full bg-[#ebedf2] dark:bg-dark/40">
                                <div
                                    class="h-full rounded-full transition-all"
                                    :class="u.near ? 'bg-danger' : 'bg-primary'"
                                    :style="{ width: `${u.pct}%` }"
                                ></div>
                            </div>
                        </div>
                        <!-- The bars above already show the caps that apply. This
                             says where they came from: without it a negotiated cap
                             just looks like the plan page is wrong. -->
                        <div v-if="isCustomised" class="border-t border-white-light pt-4 dark:border-[#1b2e4b]">
                            <h6 class="mb-2 text-xs font-semibold uppercase tracking-wide text-white-dark">
                                {{ showsComparison && customCapChanges.length ? 'Active custom changes' : 'Your agreed limits' }}
                            </h6>
                            <OrbPlanCustomizations
                                v-if="showsComparison && customCapChanges.length"
                                :changes="customCapChanges"
                                :plan-label="planLabel"
                                dense
                            />
                            <OrbPlanLimits v-else :rows="limitRows" dense />
                            <!-- Billing is owner/admin only, so a member
                                 following this would just bounce back here. -->
                            <NuxtLink v-if="isManager" to="/app/billing" class="mt-3 inline-block text-xs font-semibold text-primary hover:underline">
                                View in billing
                            </NuxtLink>
                        </div>
                        <p v-else class="border-t border-white-light pt-4 text-xs text-white-dark dark:border-[#1b2e4b]">
                            You're on the <span class="font-semibold capitalize text-primary">{{ org?.plan ?? 'free' }}</span> plan.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Organization summary -->
            <div v-if="org" class="panel">
                <div class="mb-5 flex items-center justify-between">
                    <h5 class="text-lg font-semibold dark:text-white-light">Organization</h5>
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p class="text-xs uppercase tracking-wide text-white-dark">Name</p>
                        <p class="mt-1 font-semibold dark:text-white-light">{{ org.name }}</p>
                    </div>
                    <div>
                        <p class="text-xs uppercase tracking-wide text-white-dark">Plan</p>
                        <p class="mt-1 font-semibold capitalize dark:text-white-light">{{ org.plan }}</p>
                    </div>
                    <div>
                        <p class="text-xs uppercase tracking-wide text-white-dark">2FA enforcement</p>
                        <p class="mt-1 font-semibold dark:text-white-light">{{ org.enforce_2fa ? 'Required' : 'Optional' }}</p>
                    </div>
                    <div>
                        <p class="text-xs uppercase tracking-wide text-white-dark">Status</p>
                        <p class="mt-1 flex items-center gap-2 font-semibold" :class="org.suspended ? 'text-danger' : 'text-success'">
                            <span class="h-2 w-2 rounded-full" :class="org.suspended ? 'bg-danger' : 'bg-success'"></span>
                            {{ org.suspended ? 'Suspended' : 'Active' }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
