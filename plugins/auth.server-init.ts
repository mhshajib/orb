/**
 * Populate auth.user on app start (both server and client) so route middleware
 * can synchronously check `isAuthed` without each guard re-fetching /auth/me.
 */
export default defineNuxtPlugin(async () => {
  const { user, fetchMe } = useAuth()
  if (!user.value) await fetchMe()
})
