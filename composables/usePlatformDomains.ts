import type { Domain, ResendRegion } from '@/composables/useDomains'

/**
 * Staff-console management of ORB'S OWN sending domains (the system org):
 * orb.bd (customer mailboxes + employee mail) + send.orb.bd (Orb's own transactional mail).
 * Reuses the same Domain/DNSRecord shapes as the customer domain flow.
 */
export function usePlatformDomains() {
  async function listDomains() {
    const res = await $fetch<{ data: Domain[] }>('/api/platform/domains')
    return res.data
  }
  async function getDomain(id: string) {
    const res = await $fetch<{ data: Domain }>(`/api/platform/domains/${id}`)
    return res.data
  }
  async function addDomain(domain: string, region: ResendRegion = 'ap-northeast-1') {
    const res = await $fetch<{ data: Domain }>('/api/platform/domains', { method: 'POST', body: { domain, region } })
    return res.data
  }
  async function verifyDomain(id: string) {
    const res = await $fetch<{ data: Domain }>(`/api/platform/domains/${id}/verify`, { method: 'POST' })
    return res.data
  }
  async function deleteDomain(id: string) {
    await $fetch(`/api/platform/domains/${id}`, { method: 'DELETE' })
  }
  return { listDomains, getDomain, addDomain, verifyDomain, deleteDomain }
}
