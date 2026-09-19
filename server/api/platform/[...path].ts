import { defineEventHandler, getQuery, getRouterParam, readRawBody } from 'h3'
import { callPlatform } from '../../utils/platform'

/**
 * Catch-all proxy for /api/platform/*. The platform auth routes have their own
 * files which take precedence; this forwards everything else (orgs, users,
 * audit-logs) to the backend's /platform/api/* surface with the staff cookie.
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const method = event.method
  const query = getQuery(event) as Record<string, string | string[]>
  const target = `/platform/api/${path}`

  if (method === 'GET' || method === 'HEAD') {
    return await callPlatform(event, target, { method, query })
  }

  let body: unknown
  const raw = await readRawBody(event)
  if (raw && raw.length > 0) {
    try {
      body = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf-8'))
    }
    catch {
      // no body / non-JSON
    }
  }

  return await callPlatform(event, target, { method, query, body })
})
