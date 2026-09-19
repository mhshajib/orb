/**
 * The Orb public API, described once.
 *
 * Both the API Reference (interactive) and the API Documentation (long-form)
 * render from this, and every code sample is generated from it. One definition
 * per endpoint means the curl example, the Node snippet and the parameter table
 * cannot drift apart - which is the usual way hand-written API docs go stale.
 *
 * Everything here is checked against the handlers in orb-api. If you change a
 * handler's request shape, change it here too.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface ApiParam {
  name: string
  type: 'string' | 'string[]' | 'integer' | 'number' | 'boolean' | 'object' | 'file'
  required: boolean
  /** Short constraint note, e.g. "verified sender" or "1-100". */
  note?: string
  description: string
}

export interface ApiEndpoint {
  id: string
  group: string
  title: string
  method: HttpMethod
  path: string
  summary: string
  /** Longer prose shown on the documentation page only. */
  detail?: string
  /** Path/query parameters. */
  params?: ApiParam[]
  /** JSON body fields. */
  body?: ApiParam[]
  /** Example body used to generate the code samples. */
  example?: Record<string, unknown>
  /** Example success response, pretty-printed in the response panel. */
  response: unknown
  responseStatus: number
  /** True when the endpoint accepts multipart (file upload) as well as JSON. */
  multipart?: boolean
}

export const API_BASE = 'https://api.orb.bd'

export const AUTH_NOTE = `Every request is authenticated with an API key sent as a bearer token:

    Authorization: Bearer orb_live_xxxxxxxxxxxxxxxx

Keys are created under API Credentials. The plaintext key is shown once at
creation and never again - Orb stores only a hash of it.`

export const WEBHOOK_SIGNATURE_NOTE = `Every webhook Orb sends carries these headers:

    X-Orb-Event       the event name, e.g. email.delivered
    X-Orb-Delivery    a unique id for this delivery attempt
    X-Orb-Timestamp   unix seconds, signed alongside the body
    X-Orb-Signature   sha256=<hex>

The signature is HMAC-SHA256 over "<timestamp>.<raw body>" keyed with your
webhook secret. Compare it in constant time, and reject any request whose
timestamp is too old to blunt replays.`

export const WEBHOOK_EVENTS: { event: string, title: string, description: string }[] = [
  { event: 'email.queued', title: 'Email Queued', description: 'Orb accepted the message and queued it for delivery.' },
  { event: 'email.delivered', title: 'Email Delivered', description: 'The receiving server accepted the message.' },
  { event: 'email.bounced', title: 'Email Bounced', description: 'Delivery failed permanently — the address is bad or refused it.' },
  { event: 'email.failed', title: 'Email Failed', description: 'Orb could not send the message at all.' },
  { event: 'email.complained', title: 'Spam Complaint', description: 'The recipient marked the message as spam.' },
  { event: 'domain.verified', title: 'Domain Verified', description: 'A sending domain passed DNS verification.' },
  { event: 'domain.unverified', title: 'Domain Unverified', description: 'A sending domain stopped passing verification.' },
  { event: 'user.invited', title: 'User Invited', description: 'Someone was invited to your organisation.' },
]

const emailObject = {
  id: '6a1f2c3d4e5f60718293a4b5',
  from: 'billing@yourdomain.com',
  to: ['customer@example.com'],
  subject: 'Your invoice is ready',
  status: 'queued',
  created_at: '2026-09-19T10:04:00Z',
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  // ── Emails ────────────────────────────────────────────────────────────────
  {
    id: 'send-email',
    group: 'Emails',
    title: 'Send an email',
    method: 'POST',
    path: '/api/emails',
    summary: 'Queues a message for delivery from one of your verified domains.',
    detail:
      'The sender address must belong to a domain you have verified, otherwise the request is rejected. '
      + 'Send JSON for ordinary mail. To attach files, send the same fields as multipart/form-data with one or more `attachments` parts.',
    multipart: true,
    body: [
      { name: 'from', type: 'string', required: true, note: 'verified sender', description: 'Address to send from. Its domain must be verified.' },
      { name: 'to', type: 'string[]', required: true, note: '1 or more', description: 'Recipient addresses.' },
      { name: 'subject', type: 'string', required: true, description: 'Subject line.' },
      { name: 'html', type: 'string', required: false, description: 'HTML body. Supply this, text, or both.' },
      { name: 'text', type: 'string', required: false, description: 'Plain-text body, used as the fallback part.' },
      { name: 'cc', type: 'string[]', required: false, description: 'Carbon-copy recipients.' },
      { name: 'bcc', type: 'string[]', required: false, description: 'Blind carbon-copy recipients.' },
      { name: 'reply_to', type: 'string', required: false, description: 'Address replies should go to.' },
      { name: 'parent_id', type: 'string', required: false, description: 'Id of the message being replied to; inherits its thread.' },
      { name: 'attachments', type: 'file', required: false, note: 'multipart only', description: 'One or more files. Requires multipart/form-data.' },
    ],
    example: {
      from: 'billing@yourdomain.com',
      to: ['customer@example.com'],
      subject: 'Your invoice is ready',
      html: '<h1>Invoice #1042</h1><p>Thanks for your business.</p>',
    },
    response: { data: emailObject },
    responseStatus: 201,
  },
  {
    id: 'list-emails',
    group: 'Emails',
    title: 'List emails',
    method: 'GET',
    path: '/api/emails',
    summary: 'Returns your organisation’s messages, newest first.',
    params: [
      { name: 'page', type: 'integer', required: false, note: 'default 1', description: 'Page number.' },
      { name: 'per_page', type: 'integer', required: false, note: 'default 25', description: 'Results per page.' },
    ],
    response: { data: [emailObject], meta: { total: 1, page: 1, per_page: 25 } },
    responseStatus: 200,
  },
  {
    id: 'get-email',
    group: 'Emails',
    title: 'Retrieve an email',
    method: 'GET',
    path: '/api/emails/{emailID}',
    summary: 'Returns a single message, including its current delivery status.',
    params: [{ name: 'emailID', type: 'string', required: true, description: 'The message id.' }],
    response: { data: emailObject },
    responseStatus: 200,
  },

  // ── Domains ───────────────────────────────────────────────────────────────
  {
    id: 'list-domains',
    group: 'Domains',
    title: 'List sending domains',
    method: 'GET',
    path: '/api/domains',
    summary: 'Returns every domain on your organisation and its verification state.',
    response: {
      data: [{ id: '6a1f2c3d4e5f60718293a4b6', domain: 'yourdomain.com', status: 'verified', region: 'ap-south-1' }],
    },
    responseStatus: 200,
  },
  {
    id: 'add-domain',
    group: 'Domains',
    title: 'Add a sending domain',
    method: 'POST',
    path: '/api/domains',
    summary: 'Registers a domain and returns the DNS records to publish.',
    detail: 'Publish the returned records, then call the verify endpoint. Until a domain verifies you cannot send from it.',
    body: [
      { name: 'domain', type: 'string', required: true, description: 'The domain to send from, e.g. yourdomain.com.' },
      { name: 'region', type: 'string', required: false, description: 'Sending region. Defaults to the account region.' },
    ],
    example: { domain: 'yourdomain.com' },
    response: {
      data: {
        id: '6a1f2c3d4e5f60718293a4b6',
        domain: 'yourdomain.com',
        status: 'pending',
        records: [{ type: 'TXT', name: '_orb', value: 'orb-verification=abc123' }],
      },
    },
    responseStatus: 201,
  },
  {
    id: 'verify-domain',
    group: 'Domains',
    title: 'Verify a domain',
    method: 'POST',
    path: '/api/domains/{domainID}/verify',
    summary: 'Re-checks DNS for a domain and updates its status.',
    params: [{ name: 'domainID', type: 'string', required: true, description: 'The domain id.' }],
    response: { data: { id: '6a1f2c3d4e5f60718293a4b6', domain: 'yourdomain.com', status: 'verified' } },
    responseStatus: 200,
  },

  // ── Webhooks ──────────────────────────────────────────────────────────────
  {
    id: 'list-webhooks',
    group: 'Webhooks',
    title: 'List webhooks',
    method: 'GET',
    path: '/api/webhooks',
    summary: 'Returns your configured webhook endpoints.',
    response: {
      data: [{
        id: '6a1f2c3d4e5f60718293a4b7',
        name: 'Production',
        url: 'https://yourapp.com/hooks/orb',
        events: ['email.delivered', 'email.bounced'],
        active: true,
      }],
    },
    responseStatus: 200,
  },
  {
    id: 'create-webhook',
    group: 'Webhooks',
    title: 'Create a webhook',
    method: 'POST',
    path: '/api/webhooks',
    summary: 'Subscribes a URL to the events you choose.',
    detail: 'The response includes a secret, shown once. Use it to verify the signature on every delivery.',
    body: [
      { name: 'name', type: 'string', required: true, description: 'A label to recognise this endpoint by.' },
      { name: 'url', type: 'string', required: true, note: 'https', description: 'Where Orb should POST events.' },
      { name: 'events', type: 'string[]', required: true, description: 'Events to subscribe to. See Webhook Events.' },
    ],
    example: {
      name: 'Production',
      url: 'https://yourapp.com/hooks/orb',
      events: ['email.delivered', 'email.bounced'],
    },
    response: {
      data: {
        id: '6a1f2c3d4e5f60718293a4b7',
        name: 'Production',
        url: 'https://yourapp.com/hooks/orb',
        events: ['email.delivered', 'email.bounced'],
        secret: 'whsec_shown_once_abcdef123456',
        active: true,
      },
    },
    responseStatus: 201,
  },
  {
    id: 'test-webhook',
    group: 'Webhooks',
    title: 'Send a test event',
    method: 'POST',
    path: '/api/webhooks/{webhookID}/test',
    summary: 'Delivers a sample payload so you can check your endpoint.',
    params: [{ name: 'webhookID', type: 'string', required: true, description: 'The webhook id.' }],
    response: { data: { delivered: true, status_code: 200 } },
    responseStatus: 200,
  },
  {
    id: 'webhook-deliveries',
    group: 'Webhooks',
    title: 'List deliveries',
    method: 'GET',
    path: '/api/webhooks/{webhookID}/deliveries',
    summary: 'Returns recent delivery attempts, with response codes and retries.',
    params: [{ name: 'webhookID', type: 'string', required: true, description: 'The webhook id.' }],
    response: {
      data: [{
        id: '6a1f2c3d4e5f60718293a4b8',
        event: 'email.delivered',
        status_code: 200,
        attempt: 1,
        created_at: '2026-09-19T10:05:00Z',
      }],
    },
    responseStatus: 200,
  },

  // ── Account ───────────────────────────────────────────────────────────────
  {
    id: 'get-org',
    group: 'Account',
    title: 'Retrieve your organisation',
    method: 'GET',
    path: '/api/orgs/me',
    summary: 'Returns your organisation, its plan and any negotiated limits.',
    response: {
      data: { id: '6a1f2c3d4e5f60718293a4b9', name: 'Your Company', slug: 'your-company', plan: 'business' },
    },
    responseStatus: 200,
  },
  {
    id: 'get-stats',
    group: 'Account',
    title: 'Retrieve usage',
    method: 'GET',
    path: '/api/orgs/stats',
    summary: 'Returns counters for the current billing period.',
    response: {
      data: { total_domains: 2, total_users: 5, total_sent: 1840, total_received: 96, emails_this_period: 1840 },
    },
    responseStatus: 200,
  },
  {
    id: 'list-keys',
    group: 'Account',
    title: 'List API keys',
    method: 'GET',
    path: '/api/keys',
    summary: 'Returns your keys. Only the masked preview is ever returned.',
    response: {
      data: [{ id: '6a1f2c3d4e5f60718293a4ba', name: 'Production', preview: 'orb_live_a1b2…', created_at: '2026-09-01T09:00:00Z' }],
    },
    responseStatus: 200,
  },
]

export const API_GROUPS = [...new Set(API_ENDPOINTS.map(e => e.group))]

export function endpointsByGroup(group: string) {
  return API_ENDPOINTS.filter(e => e.group === group)
}

export function findEndpoint(id: string) {
  return API_ENDPOINTS.find(e => e.id === id)
}
