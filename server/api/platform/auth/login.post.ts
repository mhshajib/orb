import { defineEventHandler, readBody } from 'h3'
import { callPlatform } from '../../../utils/platform'
import { writePlatformCookie } from '../../../utils/cookies'

interface LoginBody {
  email?: string
  password?: string
}

interface PlatformUser {
  id: string
  email: string
  name: string
  role: 'platform:super_admin' | 'platform:admin' | 'platform:support'
}

interface LoginData {
  access_token?: string
  user?: PlatformUser
  // When the staffer has 2FA enabled the backend returns a session token
  // instead of a JWT — the cookie is set only after /auth/2fa/verify succeeds.
  requires_2fa?: boolean
  session_token?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const res = await callPlatform<{ data: LoginData }>(event, '/platform/api/auth/login', {
    method: 'POST',
    body,
    auth: false,
  })

  if (res.data.requires_2fa) {
    // Don't set a cookie yet — hand the session token to the client for step two.
    return { data: { requires_2fa: true, session_token: res.data.session_token } }
  }

  writePlatformCookie(event, res.data.access_token!)
  // Return the user so the client can seed state without a second round-trip.
  return { data: { user: res.data.user } }
})
