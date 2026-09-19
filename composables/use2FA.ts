export interface SetupTOTPResult {
  secret: string
  otpauth_url: string
  backup_codes: string[]
}

const fetcher = () => (import.meta.server ? useRequestFetch() : $fetch)

export async function setupTOTP(): Promise<SetupTOTPResult> {
  const res = await fetcher()<{ data: SetupTOTPResult }>('/api/auth/2fa/setup', { method: 'POST' })
  return res.data
}

export async function confirmTOTP(totp_code: string): Promise<void> {
  await fetcher()('/api/auth/2fa/confirm', { method: 'POST', body: { totp_code } })
}

export async function disableTOTP(totp_code: string): Promise<void> {
  await fetcher()('/api/auth/2fa/disable', { method: 'POST', body: { totp_code } })
}

/** Two-step login: verify TOTP using the session_token stored server-side in the orb_2fa_session cookie. */
export async function verify2FALogin(totp_code: string): Promise<void> {
  await fetcher()('/api/auth/2fa/verify', { method: 'POST', body: { totp_code } })
}

/** Two-step login: use a backup code instead of TOTP. */
export async function verify2FABackup(backup_code: string): Promise<void> {
  await fetcher()('/api/auth/2fa/backup', { method: 'POST', body: { backup_code } })
}

/** Reset another user's 2FA (admin/owner). */
export async function resetUser2FA(userID: string): Promise<void> {
  await fetcher()(`/api/users/${userID}/reset-2fa`, { method: 'POST' })
}
