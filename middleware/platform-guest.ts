export default defineNuxtRouteMiddleware(async () => {
  const { isPlatformAuthed, fetchPlatformMe } = usePlatform()
  if (!isPlatformAuthed.value) {
    await fetchPlatformMe()
  }
  if (isPlatformAuthed.value) {
    return navigateTo('/platform')
  }
})
