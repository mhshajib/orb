import { defineEventHandler } from 'h3'
import { callBackend } from '../../utils/api'
import { clearAuthCookies, getRefreshToken } from '../../utils/cookies'

export default defineEventHandler(async (event) => {
  const refresh = getRefreshToken(event)
  // Best-effort backend logout — even if it fails (expired access token, etc.),
  // we still want to clear the client cookies.
  if (refresh) {
    try {
      await callBackend(event, '/api/auth/logout', {
        method: 'POST',
        body: { refresh_token: refresh },
      })
    }
    catch {
      // swallow — clearing cookies below is the user-visible action
    }
  }
  clearAuthCookies(event)
  return { data: { ok: true } }
})
