import type { PlanLimits } from '@/utils/plans'

/**
 * One cap where an org's negotiated override differs from its plan's published
 * value. Values arrive pre-formatted so the dashboard and the billing page
 * render the same numbers the same way.
 */
export interface CustomChange {
  key: string
  label: string
  planLabel: string
  customLabel: string
  /** True when the override is better for the customer than the plan. */
  favourable: boolean
}

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

  /**
   * Whether to tell the customer their plan has been customised.
   *
   * Enterprise is negotiated by definition - its caps ARE the custom ones, so
   * a "Custom" badge there states the obvious and a plan-vs-custom comparison
   * has no meaningful left-hand side (enterprise has no published price). Every
   * other plan has a public baseline to differ from, which is what makes the
   * badge worth showing.
   */
  const isCustomised = computed(
    () => hasCustomLimits.value && (org.value?.plan ?? 'free') !== 'enterprise',
  )

  /**
   * The caps that actually differ from the plan. Empty when nothing was
   * negotiated, or when staff set an override whose numbers happen to match the
   * plan - in which case there is genuinely nothing to show, and the comparison
   * hides itself rather than rendering a table of identical rows.
   */
  const customChanges = computed<CustomChange[]>(() => {
    const c = org.value?.custom_limits
    if (!c || !isCustomised.value)
      return []

    const base = plans.value[org.value?.plan ?? 'free']
    if (!base)
      return []

    const out: CustomChange[] = []

    // For a cap, null is unlimited, which beats every finite number.
    const capRow = (
      key: string,
      label: string,
      planVal: number | null,
      customVal: number | null,
      fmt: (n: number | null) => string = formatQuota,
    ) => {
      if (planVal === customVal)
        return
      const favourable = customVal == null ? true : planVal == null ? false : customVal > planVal
      out.push({ key, label, planLabel: fmt(planVal), customLabel: fmt(customVal), favourable })
    }

    capRow('emails', 'Emails per month', base.emails, cap(c.emails_per_month))
    capRow('users', 'Team members', base.users, cap(c.users))
    capRow('domains', 'Sending domains', base.domains, cap(c.domains))
    capRow('webhooks', 'Webhooks', base.webhooks, cap(c.webhooks))
    capRow('retention', 'Log retention', base.retentionDays, cap(c.retention_days), n =>
      n == null ? 'Unlimited' : `${n} days`)

    // Price is the one row where a bigger number is the worse outcome.
    const customMonthly = Math.round(c.monthly_price_paisa / 100)
    if (base.monthlyBDT != null && base.monthlyBDT !== customMonthly) {
      out.push({
        key: 'price',
        label: 'Monthly price',
        planLabel: formatTakaBDT(base.monthlyBDT),
        customLabel: formatTakaBDT(customMonthly),
        favourable: customMonthly < base.monthlyBDT,
      })
    }

    return out
  })

  /**
   * The cap changes only, with the negotiated price left out.
   *
   * The dashboard is visible to every member, while billing is owner/admin
   * only - so what an org pays does not belong on it. The caps themselves are
   * fine: members already see them as the quota bars right above.
   */
  const customCapChanges = computed(() => customChanges.value.filter(c => c.key !== 'price'))

  return { limits, hasCustomLimits, isCustomised, customChanges, customCapChanges }
}
