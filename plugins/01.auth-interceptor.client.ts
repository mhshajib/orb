/**
 * Global 401 handler.
 *
 * Wraps the singleton `$fetch` (an `ofetch` instance) with an
 * `onResponseError` hook that detects unauthorized responses from same-origin
 * `/api/*` calls. When one fires AND the user was previously authenticated,
 * we:
 *
 *   1. Clear local auth state (`user.value = null`) so middleware re-evaluates
 *   2. Toast: "Your session expired — please log in again."
 *   3. Redirect to /login, preserving the destination as ?next= so the user
 *      lands back where they were after re-authenticating.
 *
 * Why this guard pattern: the plugin runs the auth-probe `/api/auth/me` on
 * every page load, which 401s for unauthenticated visitors. That's expected
 * behavior, not a session-expired event — so we only fire the toast +
 * redirect when `user.value` had been set, indicating the user *was* signed
 * in and just got kicked out.
 *
 * Numbered prefix (`01.`) so this plugin loads before the existing
 * `auth.ts` plugin that runs `fetchMe()` — otherwise the very first 401
 * during initial-load would race the wrapper.
 */
export default defineNuxtPlugin(() => {
  // Skip during SSR — the wrapper relies on client-only navigation /
  // toast surfaces. The server-side $fetch already handles its own auth
  // failures via the Nitro proxy's createError.
  if (import.meta.server) return

  // Single-shot guard so simultaneous parallel 401s (e.g. several inflight
  // requests when the access token expires) only trigger one toast + one
  // navigateTo. Once the user lands on /login the flag resets via reactivity
  // (user becomes null permanently until next login).
  let alreadyKicked = false

  const original = globalThis.$fetch
  const wrapped = original.create({
    onResponseError({ request, response }) {
      const url = typeof request === 'string' ? request : request.url
      // Skip non-API calls (third-party fetches via our $fetch).
      if (!url.includes('/api/')) return

      // Always log to the console so DevTools shows what failed — critical
      // when a component eats the exception silently or an interceptor
      // higher up handles it without surfacing anything visible.
      // eslint-disable-next-line no-console
      console.error(`[api] ${response.status} ${url}`, response._data)

      if (response.status === 401) {
        const { user } = useAuth()
        // 401 on the initial-load auth probe (user was never signed in) is
        // expected, not a session-expired event.
        if (!user.value) return
        if (alreadyKicked) return
        alreadyKicked = true
        user.value = null
        useToast().error('Your session expired — please log in again.')
        const route = useRoute()
        const next = route.fullPath.startsWith('/app') ? route.fullPath : '/app'
        navigateTo({ path: '/login', query: { next } }, { replace: true })
        return
      }

      // 5xx: backend failure the user almost certainly wants to know about.
      // Component-level error handlers still run — this is a safety net so
      // a forgotten try/catch doesn't leave the user staring at an unchanged
      // page.
      if (response.status >= 500) {
        const msg = (response._data as { error?: string } | null)?.error
        useToast().error(msg || 'Something went wrong on our end. Please try again.')
      }
    },
  })

  // Replace the singleton so every existing call site (including useFetch /
  // useAsyncData via useRequestFetch) goes through the wrapper.
  globalThis.$fetch = wrapped
})
