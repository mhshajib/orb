import type { PlanLimits } from '@/utils/plans'

/**
 * The caps that actually apply to the current org: its negotiated
 * `custom_limits` where set, falling back to its plan.
 *
 * This mirrors `pkg/quota.Service.limits` on the backend, which has always
 * resolved overrides first. The UI used to read plan caps directly, so an org
 * with negotiated limits was shown its plan's numbers while the server
 * enforced something else entirely. Anything rendering a cap should use this
 * rather than reaching for `plans[...]` or the static `PLAN_LIMITS` table.
 *
 * `null` in the returned caps means unlimited, matching `usePlans`.
 */
export function useEffectiveLimits() {
  const org = useOrg()
  const { plans } = usePlans()

  // -1 is the backend's unlimited sentinel; the UI uses null for it.
  const cap = (v: number | undefined): number | null =>
    v == null ? null : v < 0 ? null : v

  const limits = computed<PlanLimits>(() => {
    const planKey = org.value?.plan ?? 'free'
    const base = plans.value[planKey]
    const c = org.value?.custom_limits
    if (!c)
      return base

    // A custom override is stored as a COMPLETE set of caps server-side, so it
    // replaces the plan's caps wholesale. Presentation fields (label, tagline)
    // still come from the plan - the override carries no naming.
    return {
      ...base,
      emails: cap(c.emails_per_month),
      users: cap(c.users),
      domains: cap(c.domains),
      webhooks: cap(c.webhooks),
      retentionDays: cap(c.retention_days),
    }
  })

  /** True when staff have negotiated caps for this org. */
  const hasCustomLimits = computed(() => !!org.value?.custom_limits)

  return { limits, hasCustomLimits }
}
