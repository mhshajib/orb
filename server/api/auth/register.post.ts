import { defineEventHandler, readBody } from 'h3'
import { callBackend } from '../../utils/api'

interface RegisterBody {
  org_name?: string
  org_slug?: string
  name?: string
  email?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RegisterBody>(event)
  // Registration no longer logs the user in — they must verify their email
  // first. No cookies are set here; the backend returns { verification_required }.
  await callBackend(event, '/api/auth/register', {
    method: 'POST',
    body,
    auth: false,
  })
  return { data: { verification_required: true } }
})
