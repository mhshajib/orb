import { createError, defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { ensureAccessToken } from '../../utils/api'

/**
 * Mints a ready-to-connect WebSocket URL for the current session.
 *
 * The backend WS handler requires the access JWT as a `?token=` query param —
 * but the JWT lives in an httpOnly cookie the browser JS can't read. We accept
 * brief in-memory exposure of the URL (and its embedded token) so the client
 * can call `new WebSocket(url)` once. The frontend should call this endpoint
 * each time it (re)connects so token rotation is picked up automatically.
 *
 * Refreshes through ensureAccessToken rather than reading the access cookie
 * directly: that cookie lives 14 minutes, so a dashboard left open longer than
 * that could never re-open its socket — the reconnect loop would 401 forever
 * while the 7-day refresh cookie sat there unused, and realtime would only come
 * back on a full page reload.
 *
 * Returns 401 only when the refresh cookie is missing or rejected too.
 */
export default defineEventHandler(async (event) => {
  const token = await ensureAccessToken(event)
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'unauthorized',
      data: { error: 'unauthorized' },
    })
  }
  const base = useRuntimeConfig().public.wsBase
  const url = `${base}?token=${encodeURIComponent(token)}`
  return { data: { url } }
})
