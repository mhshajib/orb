import type { User } from '@/composables/useUsers'

/**
 * Shared current-user state. `useAuth().user` only carries the minimum the
 * `/api/auth/me` endpoint returns (user_id / org_id / role) since that JWT
 * payload is intentionally compact. For UI surfaces that need the user's
 * name / email / avatar / 2FA status, this composable fetches the full
 * `/api/users/{user_id}` record once and shares it via `useState` so the
 * shell, settings page, and any other consumer all read from the same ref.
 *
 * Call `fetchSelf()` once in the dashboard shell on mount; subsequent
 * consumers just read `self.value`. After a profile edit, call `fetchSelf()`
 * again to refresh.
 */
export function useSelf() {
  const { user } = useAuth()
  const self = useState<User | null>('self.user', () => null)

  async function fetchSelf(): Promise<User | null> {
    const uid = user.value?.user_id
    if (!uid) {
      self.value = null
      return null
    }
    try {
      const u = await getUser(uid)
      self.value = u
      return u
    }
    catch {
      self.value = null
      return null
    }
  }

  /**
   * Initials derived from name (preferred) or email (fallback).
   * "Jane Doe" → "JD"; "alice@example.com" → "AL"; null → "?"
   */
  const initials = computed(() => {
    const u = self.value
    if (!u) return '?'
    const source = u.name?.trim() || u.email
    const parts = source.split(/[\s@.]+/).filter(Boolean)
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
  })

  /** Best display name for "logged in as" UI. */
  const displayName = computed(() => self.value?.name?.trim() || self.value?.email || '')

  return { self, fetchSelf, initials, displayName }
}
