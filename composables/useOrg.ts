/**
 * Per-org negotiated caps set by staff in the platform console. Overrides the
 * org's plan field-by-field. Absent (undefined/null) means "no override, use
 * the plan". -1 means unlimited, matching the backend's sentinel.
 */
export interface OrgCustomLimits {
  monthly_price_paisa: number
  yearly_price_paisa: number
  emails_per_month: number
  users: number
  domains: number
  webhooks: number
  retention_days: number
  attachments_over_2m: boolean
  analytics: string
}

export interface Org {
  id: string
  name: string
  slug: string
  plan: 'free' | 'startup' | 'business' | 'enterprise'
  is_system: boolean
  suspended: boolean
  enforce_2fa: boolean
  /**
   * The API has always sent this; the UI just never read it, so an org with
   * negotiated limits still saw its plan's caps everywhere (e.g. "n/15 seats"
   * for an org staff had set to unlimited). Quota enforcement on the backend
   * always honoured it, so the UI was the only thing lying.
   */
  custom_limits?: OrgCustomLimits | null
  created_at: string
  updated_at: string
}

export interface OrgStats {
  total_domains: number
  total_users: number
  total_sent: number
  total_received: number
  /** Emails sent in the current billing period (or rolling 30-day window). */
  emails_this_period: number
}

/**
 * Shared org state. Fetched once by the dashboard shell (pages/app.vue) and
 * read by descendant routes. SSR-friendly via useRequestFetch.
 */
export function useOrg() {
  return useState<Org | null>('org.current', () => null)
}

export async function fetchOrg() {
  const org = useOrg()
  const fetcher = import.meta.server ? useRequestFetch() : $fetch
  try {
    const res = await fetcher<{ data: Org }>('/api/orgs/me')
    org.value = res.data
    return res.data
  }
  catch {
    org.value = null
    return null
  }
}

export async function fetchOrgStats(): Promise<OrgStats | null> {
  const fetcher = import.meta.server ? useRequestFetch() : $fetch
  try {
    const res = await fetcher<{ data: OrgStats }>('/api/orgs/stats')
    return res.data
  }
  catch {
    return null
  }
}
