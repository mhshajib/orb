import { createError, defineEventHandler, readBody } from 'h3'
import { callBackend } from '../../utils/api'

/**
 * Runs a documented endpoint against the real API on behalf of the signed-in
 * user, for the "Try it" button in the API Reference.
 *
 * Two deliberate restrictions:
 *
 * 1. GET only, and only paths with no {placeholders}. Orb has no sandbox, so a
 *    "Try it" on POST /api/emails would send a real message to the example
 *    address on every click — a bounce against the org's own sending
 *    reputation. Reads are safe to fire; writes are not, until there is a
 *    sandbox to fire them at.
 * 2. The path must match one this portal actually documents. Without that this
 *    handler would be an open proxy to any backend route, authenticated as the
 *    user, callable with any path a caller supplies.
 *
 * Auth comes from the session cookie via callBackend, so no API key is handled
 * here at all — the backend accepts a JWT or a key on the same routes.
 */

// Kept in step with utils/apiSpec.ts. Listed explicitly rather than derived,
// because this is the security boundary and it should be readable as one list.
const ALLOWED_GET_PATHS = new Set([
  '/api/emails',
  '/api/domains',
  '/api/webhooks',
  '/api/orgs/me',
  '/api/orgs/stats',
  '/api/keys',
])

export default defineEventHandler(async (event) => {
  const { method, path } = await readBody<{ method?: string, path?: string }>(event)

  if ((method ?? '').toUpperCase() !== 'GET') {
    throw createError({ statusCode: 400, message: 'Try it supports read-only requests. Copy the sample to run this one.' })
  }
  if (!path || !ALLOWED_GET_PATHS.has(path)) {
    throw createError({ statusCode: 400, message: 'That endpoint cannot be run from here.' })
  }

  // A 4xx from the API is a result worth showing in the response panel, not a
  // failure of this handler — so errors are captured rather than rethrown.
  try {
    const body = await callBackend(event, path, { method: 'GET' })
    return { status: 200, body }
  }
  catch (err: any) {
    return {
      status: err?.statusCode ?? err?.status ?? 500,
      body: err?.data ?? { error: err?.message ?? 'request failed' },
    }
  }
})
