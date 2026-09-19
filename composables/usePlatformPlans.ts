import type { OrgPlan } from '@/composables/useBilling'

export interface PlatformPlan {
  id: string
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
  attachments_over_2m: boolean
  analytics: string
  sort_order: number
  active: boolean
}

export type PlanUpdate = Omit<PlatformPlan, 'id' | 'key' | 'sort_order'>

/** Staff editing of the base pricing plans (DB-backed; edits take effect live). */
export function usePlatformPlans() {
  async function listPlans() {
    const res = await $fetch<{ data: PlatformPlan[] }>('/api/platform/plans')
    return res.data
  }
  async function updatePlan(key: string, body: PlanUpdate) {
    const res = await $fetch<{ data: PlatformPlan }>(`/api/platform/plans/${key}`, { method: 'PUT', body })
    return res.data
  }
  return { listPlans, updatePlan }
}
