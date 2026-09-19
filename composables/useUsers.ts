export type UserRole = 'owner' | 'admin' | 'member' | 'api_user'
export type UserStatus = 'active' | 'invited' | 'pending_verification' | 'suspended'
export type AuthProvider = 'local' | 'google'

export interface User {
  id: string
  org_id: string
  email: string
  name: string
  avatar_url?: string
  auth_provider: AuthProvider
  role: UserRole
  status: UserStatus
  two_fa_enabled: boolean
  sent_count: number
  received_count: number
  created_at: string
  updated_at: string
}

export interface UserListMeta {
  total: number
  page: number
  per_page: number
  pages: number
}

const fetcher = () => (import.meta.server ? useRequestFetch() : $fetch)

export async function getUser(id: string): Promise<User> {
  const res = await fetcher()<{ data: User }>(`/api/users/${id}`)
  return res.data
}

export interface UpdateUserInput {
  name?: string
  role?: UserRole
  status?: UserStatus
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<void> {
  await fetcher()(`/api/users/${id}`, { method: 'PUT', body: input })
}

export async function listUsers(opts: { limit?: number, offset?: number } = {}): Promise<{ items: User[], meta: UserListMeta }> {
  const query: Record<string, number> = {}
  if (opts.limit) query.limit = opts.limit
  if (opts.offset) query.offset = opts.offset
  const res = await fetcher()<{ data: User[], meta: UserListMeta }>('/api/users', { query })
  return { items: res.data ?? [], meta: res.meta }
}

export interface InviteUserInput {
  email: string
  role?: 'admin' | 'member'
}

export async function inviteUser(input: InviteUserInput): Promise<User> {
  const res = await fetcher()<{ data: User }>('/api/users/invite', {
    method: 'POST',
    body: input,
  })
  return res.data
}

export interface CreateUserInput {
  name?: string
  email: string
  password: string
  role?: 'admin' | 'member'
}

/** Create an active user directly with a known password (no email invite). */
export async function createUser(input: CreateUserInput): Promise<User> {
  const res = await fetcher()<{ data: User }>('/api/users', {
    method: 'POST',
    body: input,
  })
  return res.data
}

/**
 * Check whether `email` is available for a new org user. The backend requires
 * the domain to be one of the org's verified sending domains and the address to
 * be unused. Throws on an invalid/non-org domain (HTTP 400).
 */
export async function checkUserEmail(email: string): Promise<boolean> {
  const res = await fetcher()<{ data: { available: boolean } }>('/api/users/check-email', {
    query: { email },
  })
  return res.data.available
}

export async function deleteUserById(id: string): Promise<void> {
  await fetcher()(`/api/users/${id}`, { method: 'DELETE' })
}

export async function forceResetPassword(userID: string): Promise<void> {
  await fetcher()(`/api/users/${userID}/force-reset-password`, { method: 'POST' })
}

/** Owner/admin sets a user's password directly (no email round-trip). */
export async function setUserPassword(userID: string, new_password: string): Promise<void> {
  await fetcher()(`/api/users/${userID}/set-password`, {
    method: 'POST',
    body: { new_password },
  })
}

/** Upload the current user's profile photo. Returns the new avatar URL. */
export async function uploadAvatar(userID: string, file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetcher()<{ data: { avatar_url: string } }>(`/api/users/${userID}/avatar`, {
    method: 'POST',
    body: form,
  })
  return res.data.avatar_url
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await fetcher()('/api/auth/change-password', {
    method: 'POST',
    body: { current_password, new_password },
  })
}

export interface UpdateOrgInput {
  name?: string
  enforce_2fa?: boolean
}

export async function updateOrg(input: UpdateOrgInput): Promise<void> {
  await fetcher()('/api/orgs/me', { method: 'PUT', body: input })
}
