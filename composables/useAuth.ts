interface Me {
  user_id: string
  org_id: string
  role: 'owner' | 'admin' | 'member' | 'api_user'
}

interface LoginData { ok?: true, requires_2fa?: true }

interface RegisterPayload {
  org_name: string
  org_slug: string
  name: string
  email: string
  password: string
}

export function useAuth() {
  const user = useState<Me | null>('auth.user', () => null)
  const isAuthed = computed(() => !!user.value)

  async function fetchMe() {
    // On the server, `$fetch` issues a fresh request without forwarding the
    // browser's cookies — so a logged-in user would look unauthed during SSR.
    // useRequestFetch() returns a fetcher that forwards request headers
    // (including the orb_access cookie) so SSR sees the same session as CSR.
    const fetcher = import.meta.server ? useRequestFetch() : $fetch
    try {
      const res = await fetcher<{ data: Me }>('/api/auth/me')
      user.value = res.data
      return res.data
    }
    catch (e) {
      user.value = null
      // Surface to the console so devtools shows what the auth probe actually
      // failed on (401 expected for anon visitors, anything else is a real
      // problem). Callers that need to react to the failure should use
      // fetchMeStrict() — this variant intentionally returns null on error so
      // the SSR auth probe / page mounts don't blow up.
      if (import.meta.client) {
        // eslint-disable-next-line no-console
        console.warn('[useAuth] fetchMe failed:', e)
      }
      return null
    }
  }

  // Same call but rethrows — for callers that want the error (e.g. the
  // Google callback page wants to show "session not established" instead of
  // silently bouncing the user back to /login).
  async function fetchMeStrict() {
    const fetcher = import.meta.server ? useRequestFetch() : $fetch
    const res = await fetcher<{ data: Me }>('/api/auth/me')
    user.value = res.data
    return res.data
  }

  async function login(email: string, password: string) {
    const res = await $fetch<{ data: LoginData }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    if (res.data.ok) await fetchMe()
    return res.data
  }

  async function register(payload: RegisterPayload) {
    const res = await $fetch<{ data: LoginData }>('/api/auth/register', {
      method: 'POST',
      body: payload,
    })
    if (res.data.ok) await fetchMe()
    return res.data
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    }
    catch {
      // ignore — we clear local state regardless
    }
    user.value = null
    await navigateTo('/login')
  }

  return { user, isAuthed, fetchMe, fetchMeStrict, login, register, logout }
}
