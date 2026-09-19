export type OrgPlan = 'free' | 'startup' | 'business' | 'enterprise'
export type BillingCycle = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'
export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
export type BillingProvider = 'bkash'

export interface Subscription {
  id: string
  org_id: string
  plan: OrgPlan
  cycle: BillingCycle
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  org_id: string
  plan: OrgPlan
  cycle: BillingCycle
  amount: number // in paisa (1/100 BDT)
  currency: string
  provider: string
  payment_ref: string
  transaction_id?: string
  status: InvoiceStatus
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface SubscribeResponse {
  redirect_url: string
  payment_ref: string
  invoice_id: string
}

import type { ListMeta } from '@/types/pagination'

export type { ListMeta }

const fetcher = () => (import.meta.server ? useRequestFetch() : $fetch)

/** Returns null when the org has no subscription yet (backend returns 404). */
export async function getSubscription(): Promise<Subscription | null> {
  try {
    const res = await fetcher()<{ data: Subscription }>('/api/billing/subscription')
    return res.data
  }
  catch (e: any) {
    if (e?.statusCode === 404 || e?.data?.statusCode === 404) return null
    throw e
  }
}

export async function listInvoices(opts: { limit?: number, offset?: number } = {}): Promise<{ items: Invoice[], meta: ListMeta }> {
  const query: Record<string, number> = {}
  if (opts.limit) query.limit = opts.limit
  if (opts.offset) query.offset = opts.offset
  const res = await fetcher()<{ data: Invoice[], meta: ListMeta }>('/api/billing/invoices', { query })
  return { items: res.data ?? [], meta: res.meta }
}

export async function subscribe(input: { plan: OrgPlan, cycle: BillingCycle, provider?: BillingProvider }): Promise<SubscribeResponse> {
  const res = await fetcher()<{ data: SubscribeResponse }>('/api/billing/subscribe', {
    method: 'POST',
    body: {
      plan: input.plan,
      cycle: input.cycle,
      // Provider only required for paid plans; backend tolerates empty for free.
      provider: input.plan === 'free' ? '' : (input.provider ?? 'bkash'),
    },
  })
  return res.data
}

export async function cancelSubscription(): Promise<void> {
  await fetcher()('/api/billing/cancel', { method: 'POST' })
}
