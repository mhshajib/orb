import { defineEventHandler } from 'h3'
import { callPlatform } from '../../../utils/platform'

interface Me {
  user_id: string
  email: string
  role: 'platform:super_admin' | 'platform:admin' | 'platform:support'
}

export default defineEventHandler(async event =>
  callPlatform<{ data: Me }>(event, '/platform/api/auth/me', { method: 'GET' }),
)
