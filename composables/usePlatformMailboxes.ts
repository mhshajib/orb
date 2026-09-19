import type { PlatformOrgUser } from '@/composables/usePlatform'

/**
 * Orb employee mailboxes = users in the system org with @orb.bd addresses.
 * Create = invite (employee accepts + sets password, then logs into /app and
 * uses the mailbox UI). Reset-password / suspend reuse the existing platform
 * customer-user endpoints (a system-org user is just a customer user).
 */
export function usePlatformMailboxes() {
  async function listMailboxes() {
    const res = await $fetch<{ data: PlatformOrgUser[] }>('/api/platform/mailboxes')
    return res.data
  }
  async function createMailbox(input: { email: string; name?: string; role?: 'admin' | 'member' }) {
    const res = await $fetch<{ data: PlatformOrgUser }>('/api/platform/mailboxes', { method: 'POST', body: input })
    return res.data
  }
  async function deleteMailbox(id: string) {
    await $fetch(`/api/platform/mailboxes/${id}`, { method: 'DELETE' })
  }
  // Reuse existing platform customer-user actions for system-org users.
  async function resetMailboxPassword(userId: string) {
    await $fetch(`/api/platform/users/${userId}/reset-password`, { method: 'POST' })
  }
  async function suspendMailbox(userId: string) {
    await $fetch(`/api/platform/users/${userId}/suspend`, { method: 'POST' })
  }
  async function unsuspendMailbox(userId: string) {
    await $fetch(`/api/platform/users/${userId}/unsuspend`, { method: 'POST' })
  }
  return { listMailboxes, createMailbox, deleteMailbox, resetMailboxPassword, suspendMailbox, unsuspendMailbox }
}
