export default defineNuxtRouteMiddleware(async (to) => {
  const { isPlatformAuthed, fetchPlatformMe } = usePlatform()
  if (!isPlatformAuthed.value) {
    // Hard refresh / first hit — probe the staff cookie before bouncing.
    await fetchPlatformMe()
  }
  if (!isPlatformAuthed.value) {
    return navigateTo({ path: '/platform/login', query: { next: to.fullPath } })
  }
})
