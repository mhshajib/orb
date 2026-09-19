import { defineEventHandler, getQuery, getRequestHeader, getRouterParam, readRawBody } from 'h3'
import { callBackend } from '../utils/api'

/**
 * Catch-all proxy for /api/*. Auth routes (login/register/logout/refresh/etc.)
 * and the /api/platform/* routes have their own files which take precedence;
 * this catches everything else (orgs, users, domains, emails, webhooks, api
 * keys, billing, plans, etc.) and forwards to the backend with the
 * Authorization header from cookies + auto-refresh on 401.
 *
 * Content-type aware:
 *   - multipart/form-data → forward raw bytes with the original content-type
 *     (preserves boundary; used by POST /api/emails for attachments)
 *   - everything else → JSON parse and re-serialize
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const method = event.method
  const query = getQuery(event) as Record<string, string | string[]>
  const target = `/api/${path}`

  if (method === 'GET' || method === 'HEAD') {
    return await callBackend(event, target, { method, query })
  }

  const contentType = getRequestHeader(event, 'content-type') ?? ''

  if (contentType.toLowerCase().startsWith('multipart/form-data')) {
    const raw = await readRawBody(event, false)
    return await callBackend(event, target, {
      method,
      query,
      rawBody: raw,
      headers: { 'content-type': contentType },
    })
  }

  let body: unknown
  const raw = await readRawBody(event)
  if (raw && raw.length > 0) {
    try {
      body = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf-8'))
    }
    catch {
      // Fall through with undefined; backend will reject if it expected JSON.
    }
  }

  return await callBackend(event, target, { method, query, body })
})
