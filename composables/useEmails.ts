export type EmailDirection = 'inbound' | 'outbound'
export type EmailStatus =
  | 'draft'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'received'
  | 'bounced'

export interface Email {
  id: string
  org_id: string
  domain_id: string
  user_id?: string
  resend_id?: string
  message_id?: string
  direction: EmailDirection
  status: EmailStatus
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  text_body?: string
  html_body?: string
  headers?: Record<string, string>
  has_attachments: boolean
  attachment_ids?: string[]
  read: boolean
  spam?: boolean
  starred?: boolean
  archived?: boolean
  labels?: string[]
  thread_id?: string
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

/** Mailbox folders. Maps to the backend's `?folder=` list param. */
export type EmailFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash' | 'all'

export interface Attachment {
  id: string
  org_id: string
  email_id: string
  filename: string
  content_type: string
  size: number
  s3_key: string
  created_at: string
}

import type { ListMeta } from '@/types/pagination'

export type { ListMeta }

export interface ListResult<T> {
  items: T[]
  meta: ListMeta
}

export interface EmailListFilter {
  folder?: EmailFolder
  direction?: EmailDirection
  domain_id?: string
  status?: EmailStatus
  q?: string
  unread?: boolean
  label?: string
  limit?: number
  offset?: number
}

export interface DraftInput {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html?: string
  text?: string
  reply_to?: string
}

export interface SendEmailInput {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html?: string
  text?: string
  reply_to?: string
  /** Hex id of the email being replied to — server inherits its thread_id. */
  parent_id?: string
  attachments?: File[]
}

const fetcher = () => (import.meta.server ? useRequestFetch() : $fetch)

export async function listEmails(filter: EmailListFilter = {}): Promise<ListResult<Email>> {
  const query: Record<string, string | number> = {}
  if (filter.folder) query.folder = filter.folder
  if (filter.direction) query.direction = filter.direction
  if (filter.domain_id) query.domain_id = filter.domain_id
  if (filter.status) query.status = filter.status
  if (filter.q) query.q = filter.q
  if (filter.unread) query.unread = 'true'
  if (filter.label) query.label = filter.label
  if (filter.limit) query.limit = filter.limit
  if (filter.offset) query.offset = filter.offset

  const res = await fetcher()<{ data: Email[], meta: ListMeta }>('/api/emails', { query })
  return { items: res.data ?? [], meta: res.meta }
}

export async function getEmail(id: string): Promise<Email> {
  const res = await fetcher()<{ data: Email }>(`/api/emails/${id}`)
  return res.data
}

/** Move an email to Trash (soft delete — reversible via restoreEmail). */
export async function trashEmail(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}`, { method: 'DELETE' })
}

/** Permanently delete an email and its attachments. Not reversible. */
export async function deleteEmailForever(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}`, { method: 'DELETE', query: { permanent: 'true' } })
}

/** Restore an email from Trash back to its inbox/sent view. */
export async function restoreEmail(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/restore`, { method: 'POST' })
}

/** Flag an email as spam (moves it to the Spam folder). */
export async function markSpam(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/spam`, { method: 'POST' })
}

/** Clear the spam flag (returns the email to its inbox/sent view). */
export async function markNotSpam(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/not-spam`, { method: 'POST' })
}

/** Flip an inbound message back to unread (user-driven inverse of GET-marks-read). */
export async function markUnread(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/unread`, { method: 'POST' })
}

/** Star / unstar — favourite flag, surfaces the Starred folder. */
export async function starEmail(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/star`, { method: 'POST' })
}
export async function unstarEmail(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/unstar`, { method: 'POST' })
}

/** Archive / unarchive — hides from Inbox without deleting. */
export async function archiveEmail(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/archive`, { method: 'POST' })
}
export async function unarchiveEmail(id: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/unarchive`, { method: 'POST' })
}

/** Add a freeform label. Idempotent — adding the same label twice is a no-op. */
export async function addLabel(id: string, label: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/labels`, { method: 'POST', body: { label } })
}

/** Remove a label. Idempotent. */
export async function removeLabel(id: string, label: string): Promise<void> {
  await fetcher()(`/api/emails/${id}/labels/${encodeURIComponent(label)}`, { method: 'DELETE' })
}

/** Fetch all messages in the conversation that owns this email, oldest first. */
export async function getThread(id: string): Promise<Email[]> {
  const res = await fetcher()<{ data: Email[] }>(`/api/emails/${id}/thread`)
  return res.data ?? []
}

/**
 * Upload an inline image (from the editor's file picker, paste, or drop) and
 * get back a URL the composer can embed in the email body. Backend stores
 * under media/<org>/<uuid>.ext in S3 and returns a presigned URL.
 */
export async function uploadInlineImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file, file.name || 'image')
  const res = await fetcher()<{ data: { url: string } }>('/api/emails/media/images', {
    method: 'POST',
    body: fd,
  })
  return res.data.url
}

export async function createDraft(input: DraftInput): Promise<Email> {
  const res = await fetcher()<{ data: Email }>('/api/emails/drafts', {
    method: 'POST',
    body: input,
  })
  return res.data
}

export async function updateDraft(id: string, input: DraftInput): Promise<Email> {
  const res = await fetcher()<{ data: Email }>(`/api/emails/drafts/${id}`, {
    method: 'PUT',
    body: input,
  })
  return res.data
}

export async function listAttachments(emailId: string): Promise<Attachment[]> {
  const res = await fetcher()<{ data: Attachment[] }>(`/api/emails/${emailId}/attachments`)
  return res.data ?? []
}

export async function getAttachmentUrl(attachmentId: string): Promise<string> {
  const res = await fetcher()<{ data: { url: string } }>(`/api/emails/attachments/${attachmentId}/url`)
  return res.data.url
}

/**
 * Send an email. Builds multipart/form-data with field names matching the
 * backend's r.FormValue / r.MultipartForm.Value contract.
 *
 * Goes through XMLHttpRequest (not $fetch) so the optional `onProgress`
 * callback can report upload bytes as they leave the browser. The Fetch API
 * doesn't expose request-body progress events; XHR does via `upload.onprogress`.
 * Behavioral parity with $fetch: same URL, same multipart body, same response
 * shape, same `Bearer …` cookie flow (browser attaches cookies automatically
 * since this is same-origin).
 */
export async function sendEmail(
  input: SendEmailInput,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Email> {
  const fd = new FormData()
  fd.append('from', input.from)
  for (const addr of input.to) fd.append('to', addr)
  for (const addr of input.cc ?? []) fd.append('cc', addr)
  for (const addr of input.bcc ?? []) fd.append('bcc', addr)
  fd.append('subject', input.subject)
  if (input.html) fd.append('html', input.html)
  if (input.text) fd.append('text', input.text)
  if (input.reply_to) fd.append('reply_to', input.reply_to)
  if (input.parent_id) fd.append('parent_id', input.parent_id)
  for (const file of input.attachments ?? []) fd.append('attachments', file, file.name)

  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/emails')
    // Match $fetch's accept default so the proxy's error envelope is JSON.
    xhr.setRequestHeader('Accept', 'application/json')

    if (onProgress) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onProgress(ev.loaded, ev.total)
      }
    }

    xhr.onload = () => {
      // Mimic ofetch's error-throwing behavior so callers don't have to
      // case-by-case on status — they get a thrown Error with `.data` set,
      // same shape errMsg() already understands.
      let parsed: any = null
      try { parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null }
      catch { /* non-JSON body, leave parsed null */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed?.data as Email)
        return
      }
      const err = new Error(`HTTP ${xhr.status}`) as Error & { data?: unknown, statusCode?: number }
      err.statusCode = xhr.status
      err.data = parsed
      reject(err)
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.onabort = () => reject(new Error('Upload cancelled'))

    xhr.send(fd)
  })
}
