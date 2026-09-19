// API keys + webhooks are now per-user (any member manages their own), so they
// are NOT manager-only. Team, billing and sending domains are owner/admin only.
//
// This list is a convenience, not the enforcement: the matching endpoints check
// the role themselves, because an API key carries its owner's role and would
// otherwise walk straight past anything the browser merely hides.
const MANAGER_ONLY = ['/app/users', '/app/billing', '/app/domains']

export default defineNuxtRouteMiddleware(async (to) => {
  const path = to.path

  // ── Customer app ────────────────────────────────────────────────────
  if (path === '/app' || path.startsWith('/app/')) {
    const { isAuthed, user } = useAuth()
    if (!isAuthed.value) {
      return navigateTo({ path: '/login', query: { next: to.fullPath } })
    }
    // Owner/admin-only sections.
    if (MANAGER_ONLY.some(p => path === p || path.startsWith(p + '/'))) {
      const role = user.value?.role
      if (role !== 'owner' && role !== 'admin') {
        return navigateTo('/app')
      }
    }
    return
  }

  // ── Platform (staff) ────────────────────────────────────────────────
  if (path === '/platform' || path.startsWith('/platform/')) {
    if (path === '/platform/login') return
    const { isPlatformAuthed, fetchPlatformMe } = usePlatform()
    if (!isPlatformAuthed.value) await fetchPlatformMe()
    if (!isPlatformAuthed.value) {
      return navigateTo({ path: '/platform/login', query: { next: to.fullPath } })
    }
    return
  }

  // ── Guest-only auth pages: bounce signed-in users into the app ───────
  if (path === '/login' || path === '/register') {
    const { isAuthed } = useAuth()
    if (isAuthed.value) return navigateTo('/app')
  }
})
