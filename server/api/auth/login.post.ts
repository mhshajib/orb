import { defineEventHandler, readBody, setCookie } from 'h3'
import { callBackend } from '../../utils/api'
import { writeAuthCookies } from '../../utils/cookies'

interface LoginBody {
  email?: string
  password?: string
}

interface TokenSuccess {
  access_token: string
  refresh_token: string
  expires_in: number
}

interface TwoFARequired {
  requires_2fa: true
  session_token: string
}

type LoginData = TokenSuccess | TwoFARequired

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const res = await callBackend<{ data: LoginData }>(event, '/api/auth/login', {
    method: 'POST',
    body,
    auth: false,
  })

  if ('requires_2fa' in res.data) {
    // Stash the single-use session token in a short-lived httpOnly cookie so
    // the 2FA verify page only needs to POST the TOTP code.
    setCookie(event, 'orb_2fa_session', res.data.session_token, {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 5,
    })
    return { data: { requires_2fa: true } }
  }

  writeAuthCookies(event, res.data)
  return { data: { ok: true } }
})
