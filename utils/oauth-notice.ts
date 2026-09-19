/**
 * Shared mapping between OAuth callback error codes (per the backend's
 * `?error=...` redirect contract) and a `{ destination route, notice code }`
 * pair. The destination page reads the notice code from `?notice=...` and
 * renders a matching message — see `noticeMessage()` for the copy.
 *
 * Keeping this map in one place so the callback page and the destination
 * pages can't drift.
 */

export type OAuthErrorCode =
  | 'not_registered'
  | 'account_exists'
  | 'suspended'
  | 'server_error'
  | string

export interface NoticeRedirect {
  path: '/register' | '/login'
  notice: string
}

export function redirectForOAuthError(code: OAuthErrorCode): NoticeRedirect {
  switch (code) {
    case 'not_registered':
      return { path: '/register', notice: 'oauth_not_registered' }
    case 'account_exists':
      return { path: '/login', notice: 'oauth_account_exists' }
    case 'suspended':
      return { path: '/login', notice: 'oauth_suspended' }
    case 'server_error':
      return { path: '/login', notice: 'oauth_server_error' }
    default:
      return { path: '/login', notice: 'oauth_failed' }
  }
}

export interface Notice {
  tone: 'info' | 'error'
  title: string
  body: string
}

export function noticeMessage(notice: string | undefined): Notice | null {
  if (!notice) return null
  switch (notice) {
    case 'oauth_not_registered':
      return {
        tone: 'info',
        title: 'No Orb account for that Google email',
        body: 'Sign up to create your organization and link this Google account.',
      }
    case 'oauth_account_exists':
      return {
        tone: 'info',
        title: 'You already have an account',
        body: 'An Orb account is already linked to this Google email — log in to continue.',
      }
    case 'oauth_suspended':
      return {
        tone: 'error',
        title: 'Account suspended',
        body: 'This Orb account has been suspended. Contact your org owner.',
      }
    case 'oauth_server_error':
      return {
        tone: 'error',
        title: 'Google sign-in failed',
        body: 'Something went wrong on our end. Try again in a moment.',
      }
    case 'oauth_failed':
      return {
        tone: 'error',
        title: 'Google sign-in failed',
        body: 'We couldn\'t complete the sign-in. Try again, or use email + password instead.',
      }
    default:
      return null
  }
}
