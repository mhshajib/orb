import { createError, defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getAccessToken } from '../../utils/cookies'

/**
 * Mints a ready-to-connect WebSocket URL for the current session.
 *
 * The backend WS handler requires the access JWT as a `?token=` query param —
 * but the JWT lives in an httpOnly cookie the browser JS can't read. We accept
 * brief in-memory exposure of the URL (and its embedded token) so the client
 * can call `new WebSocket(url)` once. The frontend should call this endpoint
 * each time it (re)connects so token rotation is picked up automatically.
 *
 * Returns 401 if no valid access cookie exists; the catch-all proxy's refresh
 * mechanism does not run here because the WS upgrade is a one-shot call.
 */
export default defineEventHandler((event) => {
  const token = getAccessToken(event)
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
