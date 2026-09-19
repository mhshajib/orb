import { defineEventHandler, readBody } from 'h3'
import { callBackend } from '../../utils/api'

interface Body {
  token?: string
  new_password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  await callBackend(event, '/api/auth/reset-password', {
    method: 'POST',
    body,
    auth: false,
  })
  return { data: { ok: true } }
})
