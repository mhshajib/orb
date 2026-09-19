// ── Types ──────────────────────────────────────────────────────────────
export type PlatformRole = 'platform:super_admin' | 'platform:admin' | 'platform:support'

export interface PlatformMe {
  user_id: string
  email: string
  role: PlatformRole
  must_change_password?: boolean
  twofa_enabled?: boolean
}

export interface PlatformUser {
  id: string
  email: string
  name: string
  role: PlatformRole
  must_change_password?: boolean
  twofa_enabled?: boolean
}

export interface Setup2FAResult {
  secret: string
  otpauth_url: string
  backup_codes: string[]
}

export interface PlanLimitsOverride {
  monthly_price_paisa?: number
  yearly_price_paisa?: number
  emails_per_month?: number
  users?: number
  domains?: number
  webhooks?: number
  retention_days?: number
  attachments_over_2m?: boolean
  analytics?: string
}

export interface PlatformOrg {
  id: string
  name: string
  slug: string
  plan: 'free' | 'startup' | 'business' | 'enterprise'
  is_system: boolean
  suspended: boolean
  enforce_2fa: boolean
  custom_limits?: PlanLimitsOverride | null
  created_at: string
  updated_at: string
}

export interface PlatformOrgUser {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'member' | 'api_user'
  status: 'active' | 'invited' | 'suspended'
  two_fa_enabled: boolean
  auth_provider: 'local' | 'google'
  created_at: string
  updated_at: string
}

export interface ResendUsage {
  sent_this_month: number
  received_this_month: number
  domains: number
  monthly_send_limit: number
  domain_limit: number
}

export interface AuditLog {
  id: string
  actor_id: string
  actor_email: string
  action: string
  target_type: string
  target_id: string
  payload: Record<string, unknown>
  created_at: string
}

export interface ListMeta {
  total: number
  page: number
  per_page: number
  pages: number
}

/**
 * Platform (staff) auth + data access. Talks to same-origin /api/platform/*
 * which the Nitro proxy forwards to the backend's /platform/api/* plane using
 * a separate staff cookie. No refresh flow — a 401 sends staff back to login.
 */
export function usePlatform() {
  const pUser = useState<PlatformMe | null>('platform.user', () => null)
  const isPlatformAuthed = computed(() => !!pUser.value)

  const canMutate = computed(
    () => pUser.value?.role === 'platform:super_admin' || pUser.value?.role === 'platform:admin',
  )

  async function fetchPlatformMe() {
    const fetcher = import.meta.server ? useRequestFetch() : $fetch
    try {
      const res = await fetcher<{ data: PlatformMe }>('/api/platform/auth/me')
      pUser.value = res.data
      return res.data
    }
    catch {
      pUser.value = null
      return null
    }
  }

  function seedFromUser(user: PlatformUser) {
    pUser.value = {
      user_id: user.id,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password,
      twofa_enabled: user.twofa_enabled,
    }
  }

  /**
   * Step one of staff login. If the staffer has 2FA enabled the backend returns
   * `{ requires_2fa, session_token }` and NO cookie is set yet — the caller must
   * then call verifyTwoFA() with a TOTP/backup code. Otherwise the cookie is set
   * and the user is seeded.
   */
  async function platformLogin(email: string, password: string) {
    const res = await $fetch<{ data: { user?: PlatformUser; requires_2fa?: boolean; session_token?: string } }>('/api/platform/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    if (res.data.requires_2fa) {
      return { requires2FA: true as const, sessionToken: res.data.session_token! }
    }
    seedFromUser(res.data.user!)
    return { requires2FA: false as const, user: res.data.user! }
  }

  /** Step two of staff login: complete with a TOTP code (or a backup code). */
  async function verifyTwoFA(sessionToken: string, code: string, opts: { backup?: boolean } = {}) {
    const body = opts.backup
      ? { session_token: sessionToken, backup_code: code }
      : { session_token: sessionToken, code }
    const res = await $fetch<{ data: { user: PlatformUser } }>('/api/platform/auth/2fa/verify', {
      method: 'POST',
      body,
    })
    seedFromUser(res.data.user)
    return res.data.user
  }

  // ── Self-service 2FA enrolment ────────────────────────────────────
  async function setup2FA() {
    const res = await $fetch<{ data: Setup2FAResult }>('/api/platform/auth/2fa/setup', { method: 'POST' })
    return res.data
  }
  async function confirm2FA(code: string) {
    await $fetch('/api/platform/auth/2fa/confirm', { method: 'POST', body: { code } })
    if (pUser.value) pUser.value = { ...pUser.value, twofa_enabled: true }
  }
  async function disable2FA(code: string) {
    await $fetch('/api/platform/auth/2fa/disable', { method: 'POST', body: { code } })
    if (pUser.value) pUser.value = { ...pUser.value, twofa_enabled: false }
  }
  async function resetStaff2FA(staffId: string) {
    await $fetch(`/api/platform/staff/${staffId}/reset-2fa`, { method: 'POST' })
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await $fetch('/api/platform/auth/change-password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    })
    if (pUser.value) pUser.value = { ...pUser.value, must_change_password: false }
  }

  // ── Per-client plan + custom limits ───────────────────────────────
  async function setOrgPlan(orgId: string, plan: string) {
    await $fetch(`/api/platform/orgs/${orgId}/plan`, { method: 'POST', body: { plan } })
  }
  async function setOrgLimits(orgId: string, limits: PlanLimitsOverride) {
    await $fetch(`/api/platform/orgs/${orgId}/limits`, { method: 'PUT', body: { clear: false, ...limits } })
  }
  async function clearOrgLimits(orgId: string) {
    await $fetch(`/api/platform/orgs/${orgId}/limits`, { method: 'PUT', body: { clear: true } })
  }

  async function platformLogout() {
    try {
      await $fetch('/api/platform/auth/logout', { method: 'POST' })
    }
    catch {
      // ignore
    }
    pUser.value = null
    await navigateTo('/platform/login')
  }

  // ── Orgs ──────────────────────────────────────────────────────────
  async function listOrgs(opts: { search?: string; suspended?: boolean; limit?: number; offset?: number } = {}) {
    const query: Record<string, string | number> = {}
    if (opts.search) query.search = opts.search
    if (typeof opts.suspended === 'boolean') query.suspended = String(opts.suspended)
    if (opts.limit != null) query.limit = opts.limit
    if (opts.offset != null) query.offset = opts.offset
    const res = await $fetch<{ data: PlatformOrg[] }>('/api/platform/orgs', { query })
    return res.data
  }

  async function getOrg(orgId: string) {
    const res = await $fetch<{ data: PlatformOrg }>(`/api/platform/orgs/${orgId}`)
    return res.data
  }

  async function listOrgUsers(orgId: string, opts: { limit?: number; offset?: number } = {}) {
    const res = await $fetch<{ data: PlatformOrgUser[] }>(`/api/platform/orgs/${orgId}/users`, { query: opts })
    return res.data
  }

  async function suspendOrg(orgId: string) {
    await $fetch(`/api/platform/orgs/${orgId}/suspend`, { method: 'POST' })
  }

  async function unsuspendOrg(orgId: string) {
    await $fetch(`/api/platform/orgs/${orgId}/unsuspend`, { method: 'POST' })
  }

  // ── User actions ──────────────────────────────────────────────────
  async function resetUserPassword(userId: string) {
    await $fetch(`/api/platform/users/${userId}/reset-password`, { method: 'POST' })
  }

  async function resetUser2FA(userId: string) {
    await $fetch(`/api/platform/users/${userId}/reset-2fa`, { method: 'POST' })
  }

  async function suspendUser(userId: string) {
    await $fetch(`/api/platform/users/${userId}/suspend`, { method: 'POST' })
  }

  async function unsuspendUser(userId: string) {
    await $fetch(`/api/platform/users/${userId}/unsuspend`, { method: 'POST' })
  }

  // ── Resend account usage (shared sending account) ─────────────────
  async function resendUsage() {
    const res = await $fetch<{ data: ResendUsage }>('/api/platform/resend-usage')
    return res.data
  }

  // ── Audit log ─────────────────────────────────────────────────────
  async function listAuditLogs(opts: { limit?: number; offset?: number } = {}) {
    const res = await $fetch<{ data: AuditLog[]; meta: ListMeta }>('/api/platform/audit-logs', { query: opts })
    return { items: res.data, meta: res.meta }
  }

  return {
    pUser,
    isPlatformAuthed,
    canMutate,
    fetchPlatformMe,
    platformLogin,
    verifyTwoFA,
    setup2FA,
    confirm2FA,
    disable2FA,
    resetStaff2FA,
    platformLogout,
    changePassword,
    listOrgs,
    getOrg,
    listOrgUsers,
    suspendOrg,
    unsuspendOrg,
    resetUserPassword,
    resetUser2FA,
    suspendUser,
    unsuspendUser,
    setOrgPlan,
    setOrgLimits,
    clearOrgLimits,
    resendUsage,
    listAuditLogs,
  }
}
