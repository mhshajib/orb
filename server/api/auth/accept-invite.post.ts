import { defineEventHandler, readBody } from 'h3'
import { callBackend } from '../../utils/api'
import { writeAuthCookies } from '../../utils/cookies'

interface Body {
  token?: string
  password?: string
  name?: string
}

interface TokenSuccess {
  access_token: string
  refresh_token: string
  expires_in: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const res = await callBackend<{ data: TokenSuccess }>(event, '/api/auth/accept-invite', {
    method: 'POST',
    body,
    auth: false,
  })
  writeAuthCookies(event, res.data)
  return { data: { ok: true } }
})
