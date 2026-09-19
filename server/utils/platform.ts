import type { H3Event } from 'h3'
import { createError, getRequestHeader } from 'h3'
import { useRuntimeConfig } from '#imports'
import { clearPlatformCookie, getPlatformToken } from './cookies'

interface BackendError {
  error?: string
}

interface CallOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  query?: Record<string, string | number | string[] | undefined>
  /** Attach the platform access cookie. Default true. There is NO refresh flow. */
  auth?: boolean
}

/**
 * Call the platform (staff) backend under /platform/api/*. Platform tokens are
 * signed with a separate JWT secret, live 1h, and have no refresh — on 401 we
 * clear the cookie and surface the error so the UI sends staff back to login.
 */
export async function callPlatform<T = unknown>(
  event: H3Event,
  path: string,
  opts: CallOptions = {},
): Promise<T> {
  const auth = opts.auth !== false
  const base = useRuntimeConfig().apiBase

  const headers: Record<string, string> = {
    accept: 'application/json',
    ...(opts.headers ?? {}),
  }
  if (opts.body !== undefined && !headers['content-type']) {
    headers['content-type'] = 'application/json'
  }
  if (auth) {
    const token = getPlatformToken(event)
    if (token) headers.authorization = `Bearer ${token}`
  }
  const ua = getRequestHeader(event, 'user-agent')
  if (ua && !headers['user-agent']) headers['user-agent'] = ua

  const res = await $fetch.raw<T>(path, {
    baseURL: base,
    method: opts.method as any,
    body: opts.body,
    query: opts.query,
    headers,
    ignoreResponseError: true,
  })

  if (res.status >= 400) {
    if (res.status === 401) clearPlatformCookie(event)
    const raw = res._data as BackendError | string | undefined
    let message = `Backend ${res.status}`
    if (raw && typeof raw === 'object' && typeof raw.error === 'string') message = raw.error
    else if (typeof raw === 'string' && raw.trim()) message = raw.trim().slice(0, 200)
    console.error(`[callPlatform] ${opts.method ?? 'GET'} ${path} → ${res.status}`, res._data)
    throw createError({ statusCode: res.status, statusMessage: message, data: { error: message } })
  }

  return res._data as T
}
