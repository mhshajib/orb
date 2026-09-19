<script setup lang="ts">
import type { OrgPlan } from '@/composables/useBilling'

definePageMeta({ layout: 'public' })
useHead({ title: 'Orb — Transactional email, priced in Taka' })

// Resolve auth state on the server so the header/CTAs render correctly first paint.
const { isAuthed, fetchMe } = useAuth()
if (!isAuthed.value) await fetchMe()

const { plans, orderedPlans } = usePlans()
const cycle = ref<'monthly' | 'yearly'>('monthly')

interface Feature {
  icon: string
  title: string
  body: string
}
const features: Feature[] = [
  {
    icon: 'icon-globe',
    title: 'Verified sending domains',
    body: 'Add your domain, drop in the DNS records we generate, and start sending. SPF, DKIM, and DMARC handled for you.',
  },
  {
    icon: 'icon-router',
    title: 'Signed webhooks',
    body: 'Every event — delivered, bounced, complained — POSTed to your endpoint with an HMAC-SHA256 signature.',
  },
  {
    icon: 'icon-orb',
    title: 'Real-time events',
    body: 'A live WebSocket connection pushes inbound mail, status changes, and stat updates to your dashboard instantly.',
  },
  {
    icon: 'icon-credit-card',
    title: 'BDT billing via bKash',
    body: 'Pay in Taka through bKash and local gateways. No card juggling, no FX surprises, no surprise dollar invoices.',
  },
  {
    icon: 'icon-lock',
    title: '2FA & security',
    body: 'TOTP two-factor per account with org-wide enforcement on demand. Service-account API keys with one-time reveal.',
  },
  {
    icon: 'icon-users-group',
    title: 'Team roles',
    body: 'Invite teammates as owner, admin, or member. Granular roles keep production keys out of the wrong hands.',
  },
]

const stats = [
  { value: '99.9%', label: 'Delivery uptime' },
  { value: '<30s', label: 'To first email' },
  { value: '৳', label: 'Billed in Taka' },
  { value: '24/7', label: 'Event webhooks' },
]

const codeExample = `curl https://api.orb.bd/api/emails \\
  -H "Authorization: Bearer orb_live_..." \\
  -F "from=hello@mail.acme.com" \\
  -F "to=alice@example.com" \\
  -F "subject=Welcome to Acme" \\
  -F "html=<p>Hi Alice!</p>" \\
  -F "attachments=@receipt.pdf"`

function priceFor(p: OrgPlan): string {
  const limits = plans.value[p]
  if (p === 'enterprise')
    return 'Custom'
  const amount = cycle.value === 'monthly' ? limits.monthlyBDT : limits.yearlyBDT
  return amount === 0 || amount == null ? 'Free' : formatTakaBDT(amount)
}
function priceSuffix(p: OrgPlan): string {
  if (p === 'enterprise')
    return 'contracts'
  const limits = plans.value[p]
  const amount = cycle.value === 'monthly' ? limits.monthlyBDT : limits.yearlyBDT
  if (amount === 0 || amount == null)
    return 'forever'
  return cycle.value === 'monthly' ? '/ month' : '/ year'
}
function ctaFor(p: OrgPlan): { label: string, to: string, external?: boolean } {
  if (p === 'enterprise')
    return { label: 'Contact sales', to: 'mailto:sales@orb.bd?subject=Enterprise%20plan', external: true }
  if (p === 'free')
    return { label: 'Start free', to: '/register' }
  return { label: 'Get started', to: '/register' }
}
</script>

<template>
  <div class="min-h-screen bg-white font-nunito text-black dark:bg-[#060818] dark:text-white-dark">
    <!-- Nav -->
    <LandingHeader />

    <!-- Hero -->
    <section class="relative overflow-hidden border-b border-white-light dark:border-[#1b2e4b]">
      <div class="pointer-events-none absolute inset-0 -z-10">
        <div class="absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-3xl" />
        <div class="absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full bg-secondary/15 blur-3xl" />
      </div>
      <div class="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
        <div class="space-y-7">
          <span class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            <icon-send class="h-3.5 w-3.5" />
            Built in Bangladesh
          </span>
          <h1 class="text-4xl font-extrabold leading-[1.05] tracking-tight text-dark dark:text-white-light sm:text-5xl lg:text-6xl">
            Transactional email,<br>
            <span class="text-primary">priced in Taka.</span>
          </h1>
          <p class="max-w-xl text-lg leading-relaxed text-white-dark">
            Orb is the email API built for Bangladesh. Send from your verified domains over a
            clean REST interface, get signed webhooks for every event, and pay in BDT through
            bKash — no dollars, no card hassle.
          </p>
          <div class="flex flex-wrap items-center gap-3 pt-1">
            <NuxtLink v-if="isAuthed" to="/app" class="btn btn-gradient">
              Go to dashboard
            </NuxtLink>
            <template v-else>
              <NuxtLink to="/register" class="btn btn-gradient">
                Start for free
              </NuxtLink>
              <NuxtLink to="/login" class="btn btn-outline-primary">
                Log in
              </NuxtLink>
            </template>
          </div>
          <div class="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm font-semibold text-white-dark">
            <span class="flex items-center gap-1.5"><icon-checks class="h-4 w-4 text-success" /> 50 emails / mo free</span>
            <span class="flex items-center gap-1.5"><icon-checks class="h-4 w-4 text-success" /> No card required</span>
          </div>
        </div>

        <!-- Code snippet card -->
        <div class="panel overflow-hidden !p-0 shadow-xl">
          <div class="flex items-center gap-2 border-b border-white-light bg-[#f6f8fb] px-4 py-3 dark:border-[#1b2e4b] dark:bg-[#0e1726]">
            <span class="h-3 w-3 rounded-full bg-danger/70" />
            <span class="h-3 w-3 rounded-full bg-warning/70" />
            <span class="h-3 w-3 rounded-full bg-success/70" />
            <span class="ltr:ml-2 rtl:mr-2 text-xs font-semibold text-white-dark">POST /api/emails</span>
          </div>
          <pre class="overflow-x-auto bg-[#0b1120] px-5 py-5 text-[13px] leading-relaxed text-[#e2e8f0]"><code>{{ codeExample }}</code></pre>
        </div>
      </div>

      <!-- Stat strip -->
      <div class="border-t border-white-light bg-[#f6f8fb] dark:border-[#1b2e4b] dark:bg-[#0e1726]/50">
        <div class="mx-auto grid max-w-7xl grid-cols-2 divide-white-light px-5 sm:grid-cols-4 sm:divide-x sm:px-8 dark:divide-[#1b2e4b]">
          <div v-for="s in stats" :key="s.label" class="px-4 py-6 text-center sm:text-left">
            <div class="text-2xl font-extrabold tracking-tight text-dark dark:text-white-light sm:text-3xl">{{ s.value }}</div>
            <div class="mt-0.5 text-sm text-white-dark">{{ s.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <div class="mb-12 max-w-2xl">
        <h2 class="text-3xl font-extrabold tracking-tight text-dark dark:text-white-light sm:text-4xl">Everything you need to send</h2>
        <p class="mt-3 text-lg leading-relaxed text-white-dark">
          One service for outbound, inbound, billing, and team management — wired together so you
          don't have to glue six tools yourself.
        </p>
      </div>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="f in features" :key="f.title" class="panel group transition-shadow hover:shadow-lg">
          <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
            <component :is="f.icon" class="h-5 w-5" />
          </div>
          <h3 class="text-base font-bold text-dark dark:text-white-light">{{ f.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-white-dark">{{ f.body }}</p>
        </div>
      </div>
    </section>

    <!-- Developers / code -->
    <section id="developers" class="mx-auto max-w-7xl px-5 pb-16 sm:px-8 sm:pb-24">
      <div class="panel grid items-center gap-8 lg:grid-cols-2">
        <div class="space-y-4">
          <span class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            <icon-send class="h-3.5 w-3.5" /> One endpoint
          </span>
          <h2 class="text-2xl font-extrabold tracking-tight text-dark dark:text-white-light sm:text-3xl">Send your first email in 30 seconds</h2>
          <p class="leading-relaxed text-white-dark">
            A multipart <code class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-sm text-primary">POST /api/emails</code> with your API
            key as a Bearer token. Attachments, CC/BCC, HTML and plain text — all in the same payload.
          </p>
          <p class="text-sm leading-relaxed text-white-dark">
            Don't want to write code? The dashboard ships a composer with file pickers and a domain dropdown.
          </p>
          <ul class="space-y-2 pt-1 text-sm font-semibold text-white-dark">
            <li class="flex items-center gap-2"><icon-checks class="h-4 w-4 text-success" /> Signed HMAC-SHA256 webhooks</li>
            <li class="flex items-center gap-2"><icon-checks class="h-4 w-4 text-success" /> Real-time delivery events</li>
            <li class="flex items-center gap-2"><icon-checks class="h-4 w-4 text-success" /> One-time API key reveal</li>
          </ul>
        </div>
        <div class="overflow-hidden rounded-lg border border-white-light dark:border-[#1b2e4b]">
          <div class="flex items-center gap-2 border-b border-white-light bg-[#f6f8fb] px-4 py-3 dark:border-[#1b2e4b] dark:bg-[#0e1726]">
            <span class="h-3 w-3 rounded-full bg-danger/70" />
            <span class="h-3 w-3 rounded-full bg-warning/70" />
            <span class="h-3 w-3 rounded-full bg-success/70" />
          </div>
          <pre class="overflow-x-auto bg-[#0b1120] px-5 py-5 text-[13px] leading-relaxed text-[#e2e8f0]"><code>{{ codeExample }}</code></pre>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="border-t border-white-light dark:border-[#1b2e4b]">
      <div class="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div class="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="text-3xl font-extrabold tracking-tight text-dark dark:text-white-light sm:text-4xl">Simple, local pricing</h2>
            <p class="mt-3 text-lg text-white-dark">Monthly or yearly billing. All prices in BDT, paid via bKash.</p>
          </div>
          <div class="inline-flex self-start rounded-lg border border-white-light bg-white p-1 text-sm font-semibold shadow-sm dark:border-[#1b2e4b] dark:bg-[#0e1726]">
            <button
              type="button"
              class="rounded-md px-4 py-1.5 transition-colors"
              :class="cycle === 'monthly' ? 'bg-primary text-white' : 'text-white-dark hover:text-primary'"
              @click="cycle = 'monthly'"
            >
              Monthly
            </button>
            <button
              type="button"
              class="rounded-md px-4 py-1.5 transition-colors"
              :class="cycle === 'yearly' ? 'bg-primary text-white' : 'text-white-dark hover:text-primary'"
              @click="cycle = 'yearly'"
            >
              Yearly
            </button>
          </div>
        </div>

        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="p in orderedPlans" :key="p" class="relative pt-3">
            <span
              v-if="p === 'startup'"
              class="absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow"
            >
              Most popular
            </span>
            <div
              class="panel flex h-full flex-col transition-shadow hover:shadow-lg"
              :class="p === 'startup' ? 'ring-2 ring-primary' : ''"
            >
              <h3 class="text-base font-bold capitalize text-dark dark:text-white-light">{{ plans[p].label }}</h3>
              <p class="mt-1 min-h-[2.5rem] text-sm text-white-dark">{{ plans[p].tagline }}</p>
              <div class="mt-4">
                <div class="text-3xl font-extrabold tracking-tight text-dark dark:text-white-light">{{ priceFor(p) }}</div>
                <div class="text-xs text-white-dark">{{ priceSuffix(p) }}</div>
              </div>
              <ul class="mt-5 flex-1 space-y-2.5 text-sm text-white-dark">
                <li class="flex items-center gap-2"><icon-checks class="h-4 w-4 shrink-0 text-success" /> {{ formatQuota(plans[p].emails) }} emails / mo</li>
                <li class="flex items-center gap-2"><icon-checks class="h-4 w-4 shrink-0 text-success" /> {{ formatQuota(plans[p].users) }} users</li>
                <li class="flex items-center gap-2"><icon-checks class="h-4 w-4 shrink-0 text-success" /> {{ formatDomains(plans[p].domains) }}</li>
                <li class="flex items-center gap-2"><icon-checks class="h-4 w-4 shrink-0 text-success" /> {{ formatQuota(plans[p].webhooks) }} webhooks</li>
                <li class="flex items-center gap-2">
                  <icon-checks class="h-4 w-4 shrink-0 text-success" />
                  {{ plans[p].retentionDays != null ? `${plans[p].retentionDays} day retention` : 'Custom retention' }}
                </li>
              </ul>
              <a
                v-if="ctaFor(p).external"
                :href="ctaFor(p).to"
                class="mt-6 w-full"
                :class="p === 'startup' ? 'btn btn-gradient' : 'btn btn-outline-primary'"
              >
                {{ ctaFor(p).label }}
              </a>
              <NuxtLink
                v-else
                :to="ctaFor(p).to"
                class="mt-6 w-full"
                :class="p === 'startup' ? 'btn btn-gradient' : 'btn btn-outline-primary'"
              >
                {{ ctaFor(p).label }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary px-8 py-14 text-white sm:px-12">
        <div class="pointer-events-none absolute inset-0 opacity-20">
          <div class="absolute -right-16 -top-16 h-72 w-72 rounded-full border border-white/40" />
          <div class="absolute -right-4 top-8 h-72 w-72 rounded-full border border-white/30" />
        </div>
        <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="max-w-lg space-y-2">
            <h2 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Ready to send some email?</h2>
            <p class="text-white/85">
              Your first 50 emails a month are free. Upgrade when you outgrow it — same API, same dashboard.
            </p>
          </div>
          <NuxtLink v-if="isAuthed" to="/app" class="btn shrink-0 border-white bg-white font-bold text-primary hover:bg-white/90">
            Go to dashboard
          </NuxtLink>
          <NuxtLink v-else to="/register" class="btn shrink-0 border-white bg-white font-bold text-primary hover:bg-white/90">
            Create your org
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <LandingFooter />
  </div>
</template>
