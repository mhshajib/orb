import { defineEventHandler } from 'h3'
import { callBackend } from '../../utils/api'

interface Me {
  user_id: string
  org_id: string
  role: 'owner' | 'admin' | 'member' | 'api_user'
}

export default defineEventHandler(async event =>
  callBackend<{ data: Me }>(event, '/api/auth/me', { method: 'GET' }),
)
