import type { OrgPlan } from '@/composables/useBilling'

export interface PlanLimits {
  plan: OrgPlan
  label: string
  monthlyBDT: number | null // null = custom / contact sales
  yearlyBDT: number | null
  emails: number | null // null = unlimited
  users: number | null
  domains: number | null
  webhooks: number | null
  retentionDays: number | null
  /** What this plan is for, one-liner. */
  tagline: string
}

export const PLAN_LIMITS: Record<OrgPlan, PlanLimits> = {
  free: {
    plan: 'free',
    label: 'Free',
    monthlyBDT: 0,
    yearlyBDT: 0,
    emails: 50,
    users: 3,
    // Free orgs get an Orb mailbox on the shared domain (name@orb.bd) — 0 custom
    // verified domains. Custom domains are a paid feature.
    domains: 0,
    webhooks: 1,
    retentionDays: 7,
    tagline: 'Try it out, kick the tyres.',
  },
  startup: {
    plan: 'startup',
    label: 'Startup',
    monthlyBDT: 3500,
    yearlyBDT: 42_000,
    emails: 10_000,
    users: 10,
    domains: 2,
    webhooks: 5,
    retentionDays: 30,
    tagline: 'Small teams ready to go live.',
  },
  business: {
    plan: 'business',
    label: 'Business',
    monthlyBDT: 10_500,
    yearlyBDT: 126_000,
    emails: 50_000,
    users: 50,
    domains: 5,
    webhooks: null,
    retentionDays: 90,
    tagline: 'Growing companies sending real volume.',
  },
  enterprise: {
    plan: 'enterprise',
    label: 'Enterprise',
    monthlyBDT: null,
    yearlyBDT: null,
    emails: null,
    users: null,
    domains: null,
    webhooks: null,
    retentionDays: null,
    tagline: 'Custom contracts. Talk to sales.',
  },
}

export const PLAN_ORDER: OrgPlan[] = ['free', 'startup', 'business', 'enterprise']

const taka = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 })

/** Format paisa (backend's currency unit) as BDT. */
export function formatPaisaBDT(paisa: number): string {
  return `৳ ${taka.format(Math.round(paisa / 100))}`
}

/** Format a BDT amount (whole takas) for plan-comparison rows. */
export function formatTakaBDT(taka: number): string {
  return `৳ ${new Intl.NumberFormat('en-BD').format(taka)}`
}

export function formatQuota(n: number | null): string {
  return n == null ? 'Unlimited' : new Intl.NumberFormat().format(n)
}

/** Human label for a plan's sending-domain entitlement. 0 = shared Orb domain. */
export function formatDomains(n: number | null): string {
  if (n == null) return 'Unlimited custom domains'
  if (n === 0) return 'Shared sending domain'
  return `${n} custom domain${n === 1 ? '' : 's'}`
}
