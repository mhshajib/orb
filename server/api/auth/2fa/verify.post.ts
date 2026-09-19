import { createError, defineEventHandler, deleteCookie, getCookie, readBody } from 'h3'
import { callBackend } from '../../../utils/api'
import { writeAuthCookies } from '../../../utils/cookies'

interface Body { totp_code?: string }
interface TokenSuccess {
  access_token: string
  refresh_token: string
  expires_in: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const session_token = getCookie(event, 'orb_2fa_session')
  if (!session_token) {
    throw createError({
      statusCode: 401,
      statusMessage: '2fa session expired; log in again',
      data: { error: '2fa session expired; log in again' },
    })
  }

  const res = await callBackend<{ data: TokenSuccess }>(event, '/api/auth/2fa/verify', {
    method: 'POST',
    body: { session_token, totp_code: body.totp_code },
    auth: false,
  })

  writeAuthCookies(event, res.data)
  deleteCookie(event, 'orb_2fa_session', { path: '/' })
  return { data: { ok: true } }
})
