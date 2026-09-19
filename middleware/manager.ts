// Gate routes that only owners/admins may access (Users, Billing, API keys,
// Webhooks). Members and service accounts are bounced to the dashboard.
export default defineNuxtRouteMiddleware(() => {
  const { user } = useAuth()
  const role = user.value?.role
  if (role !== 'owner' && role !== 'admin') {
    return navigateTo('/app')
  }
})
