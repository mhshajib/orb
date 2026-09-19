import { defineEventHandler } from 'h3'
import { clearPlatformCookie } from '../../../utils/cookies'

// Platform tokens are stateless (no server-side session to revoke) — logout is
// purely clearing the staff cookie.
export default defineEventHandler((event) => {
  clearPlatformCookie(event)
  return { data: { ok: true } }
})
