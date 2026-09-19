/**
 * Extract a user-facing error message from anything `$fetch` / `useAsyncData` /
 * `useFetch` throws. Two shapes show up in practice and we have to handle both:
 *
 * **`FetchError` from `$fetch`** — the response body is wrapped under `.data`:
 *   { data: { error: true, statusMessage: "msg", message: "msg",
 *             data: { error: "msg" }, stack: [...] } }
 *   Note `data.error` is a **boolean flag** here, NOT the human message.
 *   The string lives at `data.data.error` (or `data.statusMessage`).
 *
 * **`NuxtError` from `useAsyncData` / `useFetch`** — H3's createError data
 * passes through as `.data` directly:
 *   { statusMessage: "msg", data: { error: "msg" } }
 *   Here `data.error` IS the string.
 *
 * Earlier this function read `e.data.error` first and returned `true` (the
 * boolean) for FetchError, which then rendered as the literal "true" in
 * toasts and templates. Now we walk candidates in order and only accept
 * non-empty strings.
 */
export function errMsg(e: unknown, fallback = 'Something went wrong'): string {
  const er = e as {
    data?: {
      error?: unknown
      data?: { error?: unknown }
      statusMessage?: unknown
      message?: unknown
    }
    statusMessage?: unknown
    message?: unknown
  }

  const candidates: unknown[] = [
    er?.data?.data?.error,
    er?.data?.error,
    er?.data?.statusMessage,
    er?.data?.message,
    er?.statusMessage,
    er?.message,
  ]

  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c
  }
  return fallback
}
