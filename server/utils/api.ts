import type { H3Event } from 'h3'
import { createError, getRequestHeader } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  writeAuthCookies,
} from './cookies'

interface BackendError {
  error?: string
}

interface RefreshSuccess {
  data: {
    access_token: string
    refresh_token: string
    expires_in: number
  }
}

interface CallOptions {
  method?: string
  /** JSON-serializable body. Mutually exclusive with `rawBody`. */
  body?: unknown
  /** Pre-encoded body (Buffer / Uint8Array). Use for multipart, file uploads. Pair with a `content-type` header. */
  rawBody?: Buffer | Uint8Array
  /** Extra request headers (Authorization is set automatically). */
  headers?: Record<string, string>
  query?: Record<string, string | number | string[] | undefined>
  /** Attach the access cookie's Authorization header and auto-refresh on 401. Default true. */
  auth?: boolean
}

/**
 * Call the backend on behalf of the current request. Returns the raw backend
 * response body (already parsed). Throws an H3 error mirroring the backend's
 * status + message so the response envelope stays consistent for the client.
 *
 * On 401 with auth=true, attempts to refresh using the refresh cookie. If
 * refresh succeeds, the new tokens are written back to the response cookies
 * and the original request is retried once. On refresh failure, auth cookies
 * are cleared and the original 401 is propagated.
 */
export async function callBackend<T = unknown>(
  event: H3Event,
  path: string,
  opts: CallOptions = {},
): Promise<T> {
  const auth = opts.auth !== false
  const base = useRuntimeConfig().apiBase

  const attempt = async (token?: string) => {
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...(opts.headers ?? {}),
    }
    if (opts.body !== undefined && !headers['content-type']) {
      headers['content-type'] = 'application/json'
    }
    if (token) {
      headers.authorization = `Bearer ${token}`
    }
    const ua = getRequestHeader(event, 'user-agent')
    if (ua && !headers['user-agent']) headers['user-agent'] = ua

    return await $fetch.raw<T>(path, {
      baseURL: base,
      method: opts.method as any,
      body: opts.rawBody ?? opts.body,
      query: opts.query,
      headers,
      ignoreResponseError: true,
    })
  }

  let res = await attempt(auth ? getAccessToken(event) : undefined)

  if (auth && res.status === 401) {
    const refreshed = await tryRefresh(event)
    if (refreshed) {
      res = await attempt(refreshed)
    }
  }

  if (res.status >= 400) {
    if (res.status === 401) clearAuthCookies(event)
    const { message, data } = extractErrorPayload(res._data, res.status)
    console.error(`[callBackend] ${opts.method ?? 'GET'} ${path} → ${res.status}`, res._data)
    throw createError({
      statusCode: res.status,
      statusMessage: message,
      data,
    })
  }

  return res._data as T
}

function extractErrorPayload(raw: unknown, status: number): { message: string, data: BackendError } {
  if (raw && typeof raw === 'object' && 'error' in raw && typeof (raw as BackendError).error === 'string') {
    const msg = (raw as BackendError).error as string
    return { message: msg, data: { error: msg } }
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const snippet = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
    const msg = `Backend ${status}${snippet ? `: ${snippet}` : ''}`
    return { message: msg, data: { error: msg } }
  }
  const msg = `Backend ${status}`
  return { message: msg, data: { error: msg } }
}

async function tryRefresh(event: H3Event): Promise<string | undefined> {
  const refresh = getRefreshToken(event)
  if (!refresh) return undefined

  const base = useRuntimeConfig().apiBase
  const res = await $fetch.raw<RefreshSuccess | BackendError>('/api/auth/refresh', {
    baseURL: base,
    method: 'POST',
    body: { refresh_token: refresh },
    ignoreResponseError: true,
  })

  if (res.status >= 400 || !res._data || !('data' in res._data)) {
    clearAuthCookies(event)
    return undefined
  }

  const tokens = res._data.data
  writeAuthCookies(event, tokens)
  return tokens.access_token
}

/**
 * Returns a usable access token for the current request, refreshing first when
 * the access cookie has already expired.
 *
 * Needed because the access cookie's maxAge (14 min) is deliberately shorter
 * than everything else in the session: any route that reads it directly —
 * rather than going through callBackend, which refreshes on a 401 — starts
 * failing a quarter of an hour into a session even though the 7-day refresh
 * cookie is still perfectly good. /api/realtime/url is such a route.
 *
 * Returns undefined when there is no valid session at all.
 */
export async function ensureAccessToken(event: H3Event): Promise<string | undefined> {
  const current = getAccessToken(event)
  if (current) return current
  return await tryRefresh(event)
}
