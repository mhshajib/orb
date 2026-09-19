export type WebhookEvent =
  | 'email.queued'
  | 'email.delivered'
  | 'email.bounced'
  | 'email.failed'
  | 'email.complained'
  | 'domain.verified'
  | 'domain.unverified'
  | 'user.invited'

export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
  'email.queued',
  'email.delivered',
  'email.bounced',
  'email.failed',
  'email.complained',
  'domain.verified',
  'domain.unverified',
  'user.invited',
]

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  'email.queued': 'Email queued',
  'email.delivered': 'Email delivered',
  'email.bounced': 'Email bounced',
  'email.failed': 'Email failed',
  'email.complained': 'Spam complaint',
  'domain.verified': 'Domain verified',
  'domain.unverified': 'Domain unverified',
  'user.invited': 'User invited',
}

export interface Webhook {
  id: string
  org_id: string
  name: string
  url: string
  /** Only present on POST (create) and POST /rotate-secret responses. */
  secret?: string
  events: WebhookEvent[]
  active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  org_id: string
  event: WebhookEvent
  payload: string
  status_code: number
  response_body?: string
  error?: string
  attempt: number
  success: boolean
  next_retry_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

import type { ListMeta } from '@/types/pagination'

export type { ListMeta }

export interface CreateWebhookInput {
  name: string
  url: string
  events: WebhookEvent[]
}

export interface UpdateWebhookInput {
  name?: string
  url?: string
  events?: WebhookEvent[]
  active?: boolean
}

const fetcher = () => (import.meta.server ? useRequestFetch() : $fetch)

export async function listWebhooks(): Promise<Webhook[]> {
  const res = await fetcher()<{ data: Webhook[] }>('/api/webhooks')
  return res.data ?? []
}

export async function getWebhook(id: string): Promise<Webhook> {
  const res = await fetcher()<{ data: Webhook }>(`/api/webhooks/${id}`)
  return res.data
}

export async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
  const res = await fetcher()<{ data: Webhook }>('/api/webhooks', {
    method: 'POST',
    body: input,
  })
  return res.data
}

export async function updateWebhook(id: string, input: UpdateWebhookInput): Promise<Webhook> {
  const res = await fetcher()<{ data: Webhook }>(`/api/webhooks/${id}`, {
    method: 'PUT',
    body: input,
  })
  return res.data
}

export async function deleteWebhook(id: string): Promise<void> {
  await fetcher()(`/api/webhooks/${id}`, { method: 'DELETE' })
}

export async function rotateWebhookSecret(id: string): Promise<Webhook> {
  const res = await fetcher()<{ data: Webhook }>(`/api/webhooks/${id}/rotate-secret`, {
    method: 'POST',
  })
  return res.data
}

export async function testWebhook(id: string): Promise<WebhookDelivery> {
  const res = await fetcher()<{ data: WebhookDelivery }>(`/api/webhooks/${id}/test`, {
    method: 'POST',
  })
  return res.data
}

export async function listWebhookDeliveries(
  id: string,
  opts: { limit?: number, offset?: number } = {},
): Promise<{ items: WebhookDelivery[], meta: ListMeta }> {
  const query: Record<string, number> = {}
  if (opts.limit) query.limit = opts.limit
  if (opts.offset) query.offset = opts.offset
  const res = await fetcher()<{ data: WebhookDelivery[], meta: ListMeta }>(
    `/api/webhooks/${id}/deliveries`,
    { query },
  )
  return { items: res.data ?? [], meta: res.meta }
}
