export default defineNuxtRouteMiddleware((to) => {
  const { isAuthed } = useAuth()
  if (!isAuthed.value) {
    return navigateTo({ path: '/login', query: { next: to.fullPath } })
  }
})
