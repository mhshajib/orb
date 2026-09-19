<script lang="ts" setup>
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { renderSVG } from 'uqr'
import type { SetupTOTPResult } from '@/composables/use2FA'

useHead({ title: 'Settings' })

const { success, error: toastError } = useToast()
const { user } = useAuth()
const orgState = useOrg()
const isManager = computed(() => user.value?.role === 'owner' || user.value?.role === 'admin')

// ---------- Display helpers (design-only) ----------
const initials = computed(() => {
  const src = (self.value?.name || self.value?.email || '').trim()
  if (!src) return '?'
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
})
const roleLabel = computed(() => {
  const r = self.value?.role || user.value?.role
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : ''
})
const roleBadgeClass = computed(() => {
  switch (self.value?.role || user.value?.role) {
    case 'owner': return 'badge bg-primary'
    case 'admin': return 'badge bg-info'
    default: return 'badge bg-dark'
  }
})
const providerLabel = computed(() => {
  switch (self.value?.auth_provider) {
    case 'google': return 'Google'
    case 'local': return 'Email & password'
    default: return self.value?.auth_provider || '—'
  }
})

const { data: self, refresh: refreshSelf } = await useAsyncData(
  'settings-self',
  () => (user.value?.user_id ? getUser(user.value.user_id) : Promise.resolve(null)),
  { watch: [() => user.value?.user_id] },
)

// Local refresh of org if it's not in state yet (settings can be the first
// /app/* route entered, so be defensive).
if (!orgState.value) await fetchOrg()

// ---------- Profile (name) ----------
const profileName = ref('')
const profileDirty = computed(() => self.value && self.value.name !== profileName.value)
const profileSaving = ref(false)
watchEffect(() => { if (self.value) profileName.value = self.value.name })

async function saveProfile() {
  if (!self.value || profileSaving.value || !profileDirty.value) return
  profileSaving.value = true
  try {
    await updateUser(self.value.id, { name: profileName.value.trim() })
    success('Profile updated.')
    await refreshSelf()
  }
  catch (e) {
    toastError(errMsg(e, 'Could not update profile'))
  }
  finally {
    profileSaving.value = false
  }
}

// ---------- Avatar (profile photo) ----------
const { fetchSelf } = useSelf()
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)

function pickAvatar() {
  avatarInput.value?.click()
}

async function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !self.value) return
  if (!file.type.startsWith('image/')) {
    toastError('Please choose an image file.')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toastError('Image must be under 5MB.')
    return
  }
  avatarUploading.value = true
  try {
    await uploadAvatar(self.value.id, file)
    await refreshSelf() // update this page's card
    await fetchSelf() // update the global header avatar
    success('Profile photo updated.')
  }
  catch (err) {
    toastError(errMsg(err, 'Could not upload photo'))
  }
  finally {
    avatarUploading.value = false
    if (avatarInput.value) avatarInput.value.value = ''
  }
}

// ---------- Password change (local-auth only) ----------
const isLocalAuth = computed(() => self.value?.auth_provider === 'local')
const currentPw = ref('')
const newPw = ref('')
const confirmPw = ref('')
const pwSaving = ref(false)
const pwError = ref('') // Inline only for pre-submit validation (length / mismatch).

async function savePassword() {
  if (pwSaving.value) return
  pwError.value = ''
  if (newPw.value.length < 8) {
    pwError.value = 'New password must be at least 8 characters.'
    return
  }
  if (newPw.value !== confirmPw.value) {
    pwError.value = 'Passwords do not match.'
    return
  }
  pwSaving.value = true
  try {
    await changePassword(currentPw.value, newPw.value)
    success('Password updated.')
    currentPw.value = ''
    newPw.value = ''
    confirmPw.value = ''
  }
  catch (e) {
    toastError(errMsg(e, 'Password change failed'))
  }
  finally {
    pwSaving.value = false
  }
}

// ---------- 2FA ----------
type TwoFAStage = 'idle' | 'enrolling'
const twoFAStage = ref<TwoFAStage>('idle')
const twoFASetup = ref<SetupTOTPResult | null>(null)
const twoFACode = ref('')
const twoFAWorking = ref(false)
const twoFAQr = computed(() => (twoFASetup.value?.otpauth_url ? renderSVG(twoFASetup.value.otpauth_url, { border: 2 }) : ''))
const twoFAError = ref('')

async function start2FA() {
  if (twoFAWorking.value) return
  twoFAError.value = ''
  twoFAWorking.value = true
  try {
    twoFASetup.value = await setupTOTP()
    twoFAStage.value = 'enrolling'
  }
  catch (e) {
    toastError(errMsg(e, 'Could not start 2FA setup'))
  }
  finally {
    twoFAWorking.value = false
  }
}

function cancel2FAEnrol() {
  twoFAStage.value = 'idle'
  twoFASetup.value = null
  twoFACode.value = ''
  twoFAError.value = ''
}

async function confirm2FA() {
  if (twoFAWorking.value) return
  if (!/^\d{6}$/.test(twoFACode.value)) {
    twoFAError.value = 'Enter the 6-digit code from your authenticator.'
    return
  }
  twoFAWorking.value = true
  twoFAError.value = ''
  try {
    await confirmTOTP(twoFACode.value)
    twoFAStage.value = 'idle'
    twoFASetup.value = null
    twoFACode.value = ''
    success('Two-factor authentication enabled.')
    await refreshSelf()
  }
  catch (e) {
    twoFAError.value = errMsg(e, 'Could not confirm 2FA')
  }
  finally {
    twoFAWorking.value = false
  }
}

// Disable
const disableCode = ref('')
const disableOpen = ref(false)
const disabling = ref(false)
const disableError = ref('')

function openDisable() {
  disableCode.value = ''
  disableError.value = ''
  disableOpen.value = true
}

async function onDisable() {
  if (disabling.value) return
  disableError.value = ''
  if (!/^\d{6}$/.test(disableCode.value)) {
    disableError.value = 'Enter your current 6-digit code.'
    return
  }
  disabling.value = true
  try {
    await disableTOTP(disableCode.value)
    disableOpen.value = false
    disableCode.value = ''
    success('Two-factor authentication disabled.')
    await refreshSelf()
  }
  catch (e) {
    disableError.value = errMsg(e, 'Could not disable 2FA')
  }
  finally {
    disabling.value = false
  }
}

// ---------- Organization (owner/admin only) ----------
const orgName = ref('')
const orgEnforce2FA = ref(false)
const orgSaving = ref(false)
watchEffect(() => {
  if (orgState.value) {
    orgName.value = orgState.value.name
    orgEnforce2FA.value = orgState.value.enforce_2fa
  }
})
const orgDirty = computed(() => {
  if (!orgState.value) return false
  return orgState.value.name !== orgName.value || orgState.value.enforce_2fa !== orgEnforce2FA.value
})

async function saveOrg() {
  if (!isManager.value || orgSaving.value || !orgDirty.value) return
  orgSaving.value = true
  try {
    await updateOrg({ name: orgName.value.trim(), enforce_2fa: orgEnforce2FA.value })
    await fetchOrg()
    success('Organization updated.')
  }
  catch (e) {
    toastError(errMsg(e, 'Could not update organization'))
  }
  finally {
    orgSaving.value = false
  }
}
</script>

<template>
    <div>
        <!-- Breadcrumb -->
        <ul class="flex space-x-2 rtl:space-x-reverse">
            <li>
                <NuxtLink to="/app" class="text-primary hover:underline">Home</NuxtLink>
            </li>
            <li class="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                <span>Settings</span>
            </li>
        </ul>

        <div class="pt-5">
            <div class="mb-5 flex items-center justify-between">
                <h5 class="text-lg font-semibold dark:text-white-light">Settings</h5>
            </div>

            <TabGroup>
                <TabList class="mb-5 flex overflow-y-auto whitespace-nowrap border-b border-[#ebedf2] font-semibold dark:border-[#191e3a]">
                    <Tab as="template" v-slot="{ selected }">
                        <a
                            href="javascript:;"
                            class="flex gap-2 border-b border-transparent p-4 !outline-none hover:border-primary hover:text-primary"
                            :class="{ '!border-primary text-primary': selected }"
                        >
                            <icon-user class="h-5 w-5" />
                            Profile
                        </a>
                    </Tab>
                    <Tab as="template" v-slot="{ selected }">
                        <a
                            href="javascript:;"
                            class="flex gap-2 border-b border-transparent p-4 !outline-none hover:border-primary hover:text-primary"
                            :class="{ '!border-primary text-primary': selected }"
                        >
                            <icon-lock class="h-5 w-5" />
                            Security
                        </a>
                    </Tab>
                    <Tab v-if="isManager" as="template" v-slot="{ selected }">
                        <a
                            href="javascript:;"
                            class="flex gap-2 border-b border-transparent p-4 !outline-none hover:border-primary hover:text-primary"
                            :class="{ '!border-primary text-primary': selected }"
                        >
                            <icon-settings class="h-5 w-5" />
                            Organization
                        </a>
                    </Tab>
                </TabList>

                <TabPanels>
                    <!-- ============ PROFILE ============ -->
                    <TabPanel>
                        <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
                            <!-- Profile card -->
                            <div class="panel">
                                <div class="mb-5">
                                    <h5 class="text-lg font-semibold dark:text-white-light">Profile</h5>
                                </div>
                                <div class="mb-5">
                                    <div class="flex flex-col items-center justify-center">
                                        <div class="relative mb-5 h-24 w-24">
                                            <img
                                                v-if="self?.avatar_url"
                                                :src="self.avatar_url"
                                                alt="avatar"
                                                class="h-24 w-24 rounded-full object-cover"
                                            />
                                            <div
                                                v-else
                                                class="grid h-24 w-24 place-content-center rounded-full bg-primary-light text-2xl font-bold text-primary dark:bg-primary dark:text-primary-light"
                                            >
                                                {{ initials }}
                                            </div>
                                            <button
                                                type="button"
                                                class="absolute bottom-0 right-0 grid h-8 w-8 place-content-center rounded-full bg-primary text-white shadow ring-2 ring-white hover:bg-primary/90 disabled:opacity-60 dark:ring-[#0e1726]"
                                                :disabled="avatarUploading"
                                                title="Change photo"
                                                @click="pickAvatar"
                                            >
                                                <icon-loader v-if="avatarUploading" class="h-4 w-4 animate-spin" />
                                                <icon-camera v-else class="h-4 w-4" />
                                            </button>
                                            <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
                                        </div>
                                        <p class="text-xl font-semibold text-primary">{{ self?.name || '—' }}</p>
                                        <span v-if="roleLabel" :class="roleBadgeClass" class="mt-2">{{ roleLabel }}</span>
                                    </div>
                                    <ul class="m-auto mt-5 flex max-w-[220px] flex-col space-y-4 font-semibold text-white-dark">
                                        <li class="flex items-center gap-2">
                                            <icon-mail class="h-5 w-5 shrink-0" />
                                            <span class="truncate text-primary">{{ self?.email }}</span>
                                        </li>
                                        <li class="flex items-center gap-2">
                                            <icon-login class="h-5 w-5 shrink-0" />
                                            <span class="truncate">{{ providerLabel }}</span>
                                        </li>
                                        <li class="flex items-center gap-2">
                                            <icon-lock-dots class="h-5 w-5 shrink-0" />
                                            <span class="truncate">2FA {{ self?.two_fa_enabled ? 'enabled' : 'off' }}</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <!-- General information form -->
                            <div class="panel lg:col-span-2">
                                <form
                                    class="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-[#0e1726]"
                                    @submit.prevent="saveProfile"
                                >
                                    <h6 class="mb-5 text-lg font-bold">General Information</h6>
                                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div>
                                            <label for="name">Full Name</label>
                                            <input id="name" v-model="profileName" type="text" placeholder="Your name" class="form-input" />
                                        </div>
                                        <div>
                                            <label for="email">Email</label>
                                            <input id="email" :value="self?.email" type="email" class="form-input bg-[#f1f2f3] text-white-dark dark:bg-[#1b2e4b]" disabled />
                                            <p class="mt-1 text-xs text-white-dark">
                                                Email is fixed.<span v-if="self?.auth_provider === 'google'"> You signed in with Google.</span>
                                            </p>
                                        </div>
                                        <div>
                                            <label for="role">Role</label>
                                            <input id="role" :value="roleLabel" type="text" class="form-input bg-[#f1f2f3] text-white-dark dark:bg-[#1b2e4b]" disabled />
                                        </div>
                                        <div>
                                            <label for="provider">Sign-in method</label>
                                            <input id="provider" :value="providerLabel" type="text" class="form-input bg-[#f1f2f3] text-white-dark dark:bg-[#1b2e4b]" disabled />
                                        </div>
                                        <div class="mt-3 sm:col-span-2">
                                            <button type="submit" class="btn btn-primary" :disabled="!profileDirty || profileSaving">
                                                {{ profileSaving ? 'Saving…' : 'Save' }}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </TabPanel>

                    <!-- ============ SECURITY ============ -->
                    <TabPanel>
                        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <!-- Change password -->
                            <div v-if="isLocalAuth" class="panel">
                                <div class="mb-5">
                                    <h5 class="text-lg font-semibold dark:text-white-light">Change password</h5>
                                    <p class="mt-1 text-white-dark">Use at least 8 characters.</p>
                                </div>
                                <form class="space-y-5" @submit.prevent="savePassword">
                                    <div>
                                        <label for="cur-pw">Current password</label>
                                        <input id="cur-pw" v-model="currentPw" type="password" autocomplete="current-password" class="form-input" required />
                                    </div>
                                    <div>
                                        <label for="new-pw">New password</label>
                                        <input id="new-pw" v-model="newPw" type="password" autocomplete="new-password" minlength="8" class="form-input" required />
                                    </div>
                                    <div>
                                        <label for="conf-pw">Confirm new password</label>
                                        <input id="conf-pw" v-model="confirmPw" type="password" autocomplete="new-password" minlength="8" class="form-input" required />
                                    </div>
                                    <div v-if="pwError" class="rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
                                        {{ pwError }}
                                    </div>
                                    <button type="submit" class="btn btn-primary" :disabled="pwSaving">
                                        {{ pwSaving ? 'Updating…' : 'Update password' }}
                                    </button>
                                </form>
                            </div>

                            <!-- 2FA -->
                            <div class="panel" :class="{ 'lg:col-span-2': !isLocalAuth }">
                                <div class="mb-5">
                                    <h5 class="text-lg font-semibold dark:text-white-light">Two-factor authentication</h5>
                                    <p class="mt-1 text-white-dark">
                                        Adds a TOTP code (Authy, Google Authenticator, 1Password, etc.) on top of your password.
                                    </p>
                                </div>

                                <!-- Already enabled -->
                                <template v-if="self?.two_fa_enabled && twoFAStage === 'idle'">
                                    <div class="flex flex-wrap items-center justify-between gap-4">
                                        <div class="flex items-center gap-2 text-sm">
                                            <span class="badge badge-outline-success gap-1.5">
                                                <span class="h-1.5 w-1.5 rounded-full bg-success"></span> Enabled
                                            </span>
                                            <span class="text-white-dark">Codes are required on every sign-in.</span>
                                        </div>
                                        <button type="button" class="btn btn-outline-danger btn-sm" @click="openDisable">Disable</button>
                                    </div>
                                </template>

                                <!-- Not enabled, idle -->
                                <template v-else-if="!self?.two_fa_enabled && twoFAStage === 'idle'">
                                    <div class="flex flex-wrap items-center justify-between gap-4">
                                        <div class="flex items-center gap-2 text-sm">
                                            <span class="badge bg-dark gap-1.5">
                                                <span class="h-1.5 w-1.5 rounded-full bg-white-light"></span> Not enabled
                                            </span>
                                            <span class="text-white-dark">Recommended for all accounts.</span>
                                        </div>
                                        <button type="button" class="btn btn-primary" :disabled="twoFAWorking" @click="start2FA">
                                            {{ twoFAWorking ? 'Starting…' : 'Set up 2FA' }}
                                        </button>
                                    </div>
                                </template>

                                <!-- Enrolling -->
                                <template v-else-if="twoFAStage === 'enrolling' && twoFASetup">
                                    <div class="space-y-5">
                                        <div class="rounded-lg border border-[#ebedf2] p-4 dark:border-[#1b2e4b]">
                                            <p class="mb-3 text-sm dark:text-white-light">
                                                Scan this QR code with your authenticator app, or enter the secret manually.
                                            </p>
                                            <div class="mb-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                                <div class="h-44 w-44 shrink-0 rounded-lg bg-white p-2 [&_svg]:h-full [&_svg]:w-full" v-html="twoFAQr" />
                                                <p class="text-xs text-white-dark">
                                                    Can't scan? Use the setup link or secret below to add the account manually.
                                                </p>
                                            </div>
                                            <label class="mb-1.5 block text-xs font-semibold uppercase text-white-dark">Setup link (otpauth)</label>
                                            <div class="mb-4 flex items-center gap-2 rounded border border-[#ebedf2] bg-[#f1f2f3] p-2 dark:border-[#1b2e4b] dark:bg-[#1b2e4b]">
                                                <span class="flex-1 break-all font-mono text-xs">{{ twoFASetup.otpauth_url }}</span>
                                                <OrbCopyButton :value="twoFASetup.otpauth_url" />
                                            </div>
                                            <label class="mb-1.5 block text-xs font-semibold uppercase text-white-dark">Secret</label>
                                            <div class="flex items-center gap-2 rounded border border-[#ebedf2] bg-[#f1f2f3] p-2 dark:border-[#1b2e4b] dark:bg-[#1b2e4b]">
                                                <span class="flex-1 break-all font-mono text-sm tracking-wider">{{ twoFASetup.secret }}</span>
                                                <OrbCopyButton :value="twoFASetup.secret" />
                                            </div>
                                        </div>

                                        <div class="rounded-lg border border-[#ebedf2] p-4 dark:border-[#1b2e4b]">
                                            <div class="mb-2 flex items-center justify-between">
                                                <label class="font-semibold dark:text-white-light">Backup codes</label>
                                                <OrbCopyButton :value="twoFASetup.backup_codes.join('\n')" label="Copy all" />
                                            </div>
                                            <p class="mb-3 text-xs text-white-dark">
                                                Save these somewhere safe. Each works once if you lose access to your authenticator. They won't be shown again.
                                            </p>
                                            <div class="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-3">
                                                <div v-for="bc in twoFASetup.backup_codes" :key="bc" class="rounded bg-[#f1f2f3] px-2 py-1 dark:bg-[#1b2e4b]">
                                                    {{ bc }}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label for="confirm-totp">Confirm with a code</label>
                                            <input
                                                id="confirm-totp"
                                                v-model="twoFACode"
                                                inputmode="numeric"
                                                maxlength="6"
                                                placeholder="123456"
                                                autocomplete="one-time-code"
                                                class="form-input max-w-[200px] tracking-[0.3em]"
                                            />
                                            <p class="mt-1 text-xs text-white-dark">
                                                Enter the current 6-digit code from your authenticator to finish enrolment.
                                            </p>
                                        </div>

                                        <div v-if="twoFAError" class="rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
                                            {{ twoFAError }}
                                        </div>

                                        <div class="flex justify-end gap-2">
                                            <button type="button" class="btn btn-outline-primary" :disabled="twoFAWorking" @click="cancel2FAEnrol">Cancel</button>
                                            <button type="button" class="btn btn-primary" :disabled="twoFAWorking" @click="confirm2FA">
                                                {{ twoFAWorking ? 'Confirming…' : 'Enable 2FA' }}
                                            </button>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </TabPanel>

                    <!-- ============ ORGANIZATION ============ -->
                    <TabPanel v-if="isManager">
                        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <div class="panel">
                                <div class="mb-5">
                                    <h5 class="text-lg font-semibold dark:text-white-light">Organization</h5>
                                    <p class="mt-1 text-white-dark">Workspace name and security policy.</p>
                                </div>

                                <div class="space-y-5">
                                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div>
                                            <label for="org-name">Name</label>
                                            <input id="org-name" v-model="orgName" type="text" class="form-input" />
                                        </div>
                                        <div>
                                            <label for="org-slug">Slug</label>
                                            <input id="org-slug" :value="orgState?.slug" type="text" class="form-input bg-[#f1f2f3] font-mono text-white-dark dark:bg-[#1b2e4b]" disabled />
                                            <p class="mt-1 text-xs text-white-dark">Slug is fixed.</p>
                                        </div>
                                    </div>

                                    <div class="flex items-start justify-between gap-4 rounded-lg border border-[#ebedf2] p-4 dark:border-[#1b2e4b]">
                                        <div>
                                            <div class="font-semibold dark:text-white-light">Enforce 2FA org-wide</div>
                                            <p class="mt-0.5 text-xs text-white-dark">
                                                When on, every member must set up 2FA. Users without it are blocked on every endpoint except the 2FA setup flow.
                                            </p>
                                        </div>
                                        <label class="relative mt-0.5 h-6 w-12 shrink-0">
                                            <input v-model="orgEnforce2FA" type="checkbox" class="custom_switch peer absolute z-10 h-full w-full cursor-pointer opacity-0" />
                                            <span
                                                class="block h-full rounded-full bg-[#ebedf2] before:absolute before:bottom-1 before:left-1 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-all before:duration-300 peer-checked:bg-primary peer-checked:before:left-7 dark:bg-dark dark:before:bg-white-dark dark:peer-checked:before:bg-white"
                                            ></span>
                                        </label>
                                    </div>

                                    <button type="button" class="btn btn-primary" :disabled="!orgDirty || orgSaving" @click="saveOrg">
                                        {{ orgSaving ? 'Saving…' : 'Save organization' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>

        <!-- Disable 2FA modal -->
        <div v-if="disableOpen" class="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
            <div class="panel w-full max-w-md rounded-lg">
                <div class="mb-4 flex items-center justify-between">
                    <h5 class="text-lg font-semibold dark:text-white-light">Disable two-factor authentication?</h5>
                    <button type="button" class="text-white-dark hover:text-dark" @click="disableOpen = false">
                        <icon-x class="h-5 w-5" />
                    </button>
                </div>
                <p class="mb-4 text-sm text-white-dark">
                    Your account will be secured by password only. Enter a 6-digit code from your authenticator to confirm.
                </p>
                <input
                    v-model="disableCode"
                    inputmode="numeric"
                    maxlength="6"
                    placeholder="123456"
                    autocomplete="one-time-code"
                    class="form-input tracking-[0.3em]"
                />
                <div v-if="disableError" class="mt-3 rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
                    {{ disableError }}
                </div>
                <div class="mt-6 flex justify-end gap-2">
                    <button type="button" class="btn btn-outline-primary" @click="disableOpen = false">Cancel</button>
                    <button type="button" class="btn btn-danger" :disabled="disabling" @click="onDisable">
                        {{ disabling ? 'Disabling…' : 'Disable 2FA' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
