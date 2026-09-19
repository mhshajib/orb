export interface DNSRecord {
  record: string
  name: string
  type: string
  ttl: string
  value: string
  priority: number
  status: string
}

export type DomainStatus = 'pending' | 'verified' | 'failed'

export interface Domain {
  id: string
  org_id: string
  domain: string
  resend_domain_id?: string
  status: DomainStatus
  dns_records?: DNSRecord[]
  sent_count: number
  received_count: number
  region: string
  created_at: string
  updated_at: string
}

const fetcher = () => (import.meta.server ? useRequestFetch() : $fetch)

export async function listDomains(): Promise<Domain[]> {
  const res = await fetcher()<{ data: Domain[] }>('/api/domains')
  return res.data ?? []
}

export async function getDomain(id: string) {
  const res = await fetcher()<{ data: Domain }>(`/api/domains/${id}`)
  return res.data
}

/** Resend's supported regions. Tokyo is closest to Bangladesh. */
export const RESEND_REGIONS = [
  { value: 'ap-northeast-1', label: 'Tokyo (ap-northeast-1) — closest to BD' },
  { value: 'eu-west-1', label: 'Ireland (eu-west-1)' },
  { value: 'us-east-1', label: 'N. Virginia (us-east-1)' },
  { value: 'sa-east-1', label: 'São Paulo (sa-east-1)' },
] as const

export type ResendRegion = typeof RESEND_REGIONS[number]['value']

export async function addDomain(domain: string, region: ResendRegion = 'ap-northeast-1') {
  const res = await fetcher()<{ data: Domain }>('/api/domains', {
    method: 'POST',
    body: { domain, region },
  })
  return res.data
}

export async function verifyDomain(id: string) {
  const res = await fetcher()<{ data: Domain }>(`/api/domains/${id}/verify`, {
    method: 'POST',
  })
  return res.data
}

export async function deleteDomain(id: string) {
  await fetcher()(`/api/domains/${id}`, { method: 'DELETE' })
}
