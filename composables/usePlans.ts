import type { OrgPlan } from '@/composables/useBilling'
import type { PlanLimits } from '@/utils/plans'

/** Shape returned by GET /api/plans (the DB-backed plans, paisa + -1 sentinels). */
interface ApiPlan {
  key: OrgPlan
  label: string
  tagline: string
  monthly_price_paisa: number
  yearly_price_paisa: number
  emails_per_month: number
  users: number
  domains: number
  webhooks: number
  retention_days: number
}

/**
 * Plans for the public pricing table + billing page. Sourced from the DB
 * (so platform-admin edits show without a frontend deploy), with the in-code
 * PLAN_LIMITS as the synchronous fallback for first paint / API failure.
 */
export function usePlans() {
  const { data } = useAsyncData(
    'public-plans',
    () => $fetch<{ data: ApiPlan[] }>('/api/plans'),
    { default: () => null },
  )

  // -1 is the backend's "unlimited" sentinel; the UI uses null for that.
  const cap = (v: number): number | null => (v < 0 ? null : v)

  const plans = computed<Record<OrgPlan, PlanLimits>>(() => {
    const map: Record<string, PlanLimits> = {}
    for (const key of Object.keys(PLAN_LIMITS) as OrgPlan[]) {
      map[key] = { ...PLAN_LIMITS[key] }
    }
    for (const p of data.value?.data ?? []) {
      // Enterprise is custom-quoted → null price ("Custom"); others are paisa→BDT.
      const custom = p.key === 'enterprise'
      map[p.key] = {
        plan: p.key,
        label: p.label,
        tagline: p.tagline,
        monthlyBDT: custom ? null : Math.round(p.monthly_price_paisa / 100),
        yearlyBDT: custom ? null : Math.round(p.yearly_price_paisa / 100),
        emails: cap(p.emails_per_month),
        users: cap(p.users),
        domains: cap(p.domains),
        webhooks: cap(p.webhooks),
        retentionDays: cap(p.retention_days),
      }
    }
    return map as Record<OrgPlan, PlanLimits>
  })

  const order: OrgPlan[] = ['free', 'startup', 'business', 'enterprise']
  const orderedPlans = computed(() => order.filter(k => plans.value[k]))

  return { plans, orderedPlans }
}
