export interface Org {
  id: string
  name: string
  slug: string
  plan: 'free' | 'startup' | 'business' | 'enterprise'
  is_system: boolean
  suspended: boolean
  enforce_2fa: boolean
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
