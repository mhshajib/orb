import type { H3Event } from 'h3'
import { deleteCookie, getCookie, setCookie } from 'h3'

// ── Customer plane cookies ─────────────────────────────────────────────
export const ACCESS_COOKIE = 'orb_access'
export const REFRESH_COOKIE = 'orb_refresh'
// Holds the single-use Google registration token between the OAuth exchange and
// the /onboarding step where the user names their org. Short-lived + httpOnly.
export const PENDING_REG_COOKIE = 'orb_pending_reg'
const PENDING_REG_MAX_AGE = 60 * 25

// ── Platform (staff) plane cookie ──────────────────────────────────────
// Platform tokens live 1h and have NO refresh flow — staff re-login when expired.
export const PLATFORM_COOKIE = 'orb_pf_access'
const PLATFORM_MAX_AGE = 60 * 60

// Backend says access tokens live 15 min and refresh tokens 7 days.
// Keep the access cookie maxAge slightly under the JWT TTL so a stale cookie
// can never outlive its token.
const ACCESS_MAX_AGE = 60 * 14
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7

interface TokenPair {
  access_token: string
  refresh_token: string
  expires_in?: number
}

export function writeAuthCookies(event: H3Event, tokens: TokenPair) {
  const secure = !import.meta.dev
  setCookie(event, ACCESS_COOKIE, tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  })
  setCookie(event, REFRESH_COOKIE, tokens.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  })
}

export function clearAuthCookies(event: H3Event) {
  deleteCookie(event, ACCESS_COOKIE, { path: '/' })
  deleteCookie(event, REFRESH_COOKIE, { path: '/' })
}

export function getAccessToken(event: H3Event): string | undefined {
  return getCookie(event, ACCESS_COOKIE)
}

export function getRefreshToken(event: H3Event): string | undefined {
  return getCookie(event, REFRESH_COOKIE)
}

// ── Pending Google registration ───────────────────────────────────────
export function writePendingRegCookie(event: H3Event, token: string) {
  setCookie(event, PENDING_REG_COOKIE, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_REG_MAX_AGE,
  })
}

export function getPendingRegToken(event: H3Event): string | undefined {
  return getCookie(event, PENDING_REG_COOKIE)
}

export function clearPendingRegCookie(event: H3Event) {
  deleteCookie(event, PENDING_REG_COOKIE, { path: '/' })
}

// ── Platform plane ────────────────────────────────────────────────────
export function writePlatformCookie(event: H3Event, token: string) {
  setCookie(event, PLATFORM_COOKIE, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: PLATFORM_MAX_AGE,
  })
}

export function getPlatformToken(event: H3Event): string | undefined {
  return getCookie(event, PLATFORM_COOKIE)
}

export function clearPlatformCookie(event: H3Event) {
  deleteCookie(event, PLATFORM_COOKIE, { path: '/' })
}
