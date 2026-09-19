// API keys + webhooks are now per-user (any member manages their own), so they
// are NOT manager-only. Team + billing remain owner/admin only.
const MANAGER_ONLY = ['/app/users', '/app/billing']

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

  // ── Developer portal ────────────────────────────────────────────────
  // Its own shell rather than a section of /app, but it is still customer-only:
  // it shows the org's API credentials and can fire real API calls as them.
  if (path === '/developers' || path.startsWith('/developers/')) {
    const { isAuthed } = useAuth()
    if (!isAuthed.value) {
      return navigateTo({ path: '/login', query: { next: to.fullPath } })
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
