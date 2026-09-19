import { defineEventHandler, readBody } from 'h3'
import { callBackend } from '../../utils/api'

interface Body {
  email?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  return await callBackend<{ data: { message: string } }>(event, '/api/auth/forgot-password', {
    method: 'POST',
    body,
    auth: false,
  })
})
