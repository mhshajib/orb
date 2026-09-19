import { defineEventHandler, readBody } from 'h3'
import { callPlatform } from '../../../../utils/platform'
import { writePlatformCookie } from '../../../../utils/cookies'

interface VerifyBody {
  session_token?: string
  code?: string
  backup_code?: string
}

interface PlatformUser {
  id: string
  email: string
  name: string
  role: 'platform:super_admin' | 'platform:admin' | 'platform:support'
}

interface VerifyData {
  access_token: string
  user: PlatformUser
}

export default defineEventHandler(async (event) => {
  const body = await readBody<VerifyBody>(event)
  const res = await callPlatform<{ data: VerifyData }>(event, '/platform/api/auth/2fa/verify', {
    method: 'POST',
    body,
    auth: false,
  })

  writePlatformCookie(event, res.data.access_token)
  return { data: { user: res.data.user } }
})
