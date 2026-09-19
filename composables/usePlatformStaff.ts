import type { PlatformRole } from '@/composables/usePlatform'

export interface PlatformStaff {
  id: string
  email: string
  name: string
  role: PlatformRole
  active: boolean
  twofa_enabled?: boolean
  created_at: string
  updated_at: string
}

/** Manage Orb console (staff) users. Super-admin only. */
export function usePlatformStaff() {
  async function listStaff() {
    const res = await $fetch<{ data: PlatformStaff[] }>('/api/platform/staff')
    return res.data
  }
  async function createStaff(input: { email: string; name?: string; role: PlatformRole; password: string }) {
    const res = await $fetch<{ data: PlatformStaff }>('/api/platform/staff', { method: 'POST', body: input })
    return res.data
  }
  async function updateStaff(id: string, input: { name: string; role: PlatformRole; active: boolean }) {
    await $fetch(`/api/platform/staff/${id}`, { method: 'PUT', body: input })
  }
  async function resetStaffPassword(id: string, newPassword: string) {
    await $fetch(`/api/platform/staff/${id}/reset-password`, { method: 'POST', body: { new_password: newPassword } })
  }
  return { listStaff, createStaff, updateStaff, resetStaffPassword }
}
