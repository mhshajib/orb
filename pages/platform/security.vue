<script setup lang="ts">
import { renderSVG } from 'uqr'

definePageMeta({ layout: 'platform' })
useHead({ title: 'Security · Staff Console' })

const toast = useToast()
const { pUser, fetchPlatformMe, setup2FA, confirm2FA, disable2FA } = usePlatform()

const enabled = computed(() => !!pUser.value?.twofa_enabled)

// ── Enrolment flow ────────────────────────────────────────────────
type Phase = 'idle' | 'enrolling'
const phase = ref<Phase>('idle')
const secret = ref('')
const otpauthUrl = ref('')
const backupCodes = ref<string[]>([])
const qrSvg = computed(() => (otpauthUrl.value ? renderSVG(otpauthUrl.value, { border: 2 }) : ''))

const confirmCode = ref('')
const busy = ref(false)
const err = ref('')

// ── Disable flow ──────────────────────────────────────────────────
const disableOpen = ref(false)
const disableCode = ref('')
const disableErr = ref('')

onMounted(() => { fetchPlatformMe() })

async function startEnrol() {
  if (busy.value) return
  err.value = ''
  busy.value = true
  try {
    const res = await setup2FA()
    secret.value = res.secret
    otpauthUrl.value = res.otpauth_url
    backupCodes.value = res.backup_codes
    confirmCode.value = ''
    phase.value = 'enrolling'
  }
  catch (e) {
    toast.error(errMsg(e, 'Could not start 2FA setup'))
  }
  finally {
    busy.value = false
  }
}

async function confirmEnrol() {
  if (busy.value) return
  err.value = ''
  if (!/^\d{6}$/.test(confirmCode.value.trim())) {
    err.value = 'Enter the 6-digit code from your authenticator app.'
    return
  }
  busy.value = true
  try {
    await confirm2FA(confirmCode.value.trim())
    toast.success('Two-factor authentication enabled.')
    phase.value = 'idle'
    secret.value = ''
    otpauthUrl.value = ''
    // Keep backup codes visible after enabling so the user can save them.
  }
  catch (e) {
    err.value = errMsg(e, 'Verification failed')
  }
  finally {
    busy.value = false
  }
}

function cancelEnrol() {
  phase.value = 'idle'
  secret.value = ''
  otpauthUrl.value = ''
  backupCodes.value = []
  confirmCode.value = ''
  err.value = ''
}

async function submitDisable() {
  if (busy.value) return
  disableErr.value = ''
  if (!disableCode.value.trim()) {
    disableErr.value = 'Enter a current authentication code.'
    return
  }
  busy.value = true
  try {
    await disable2FA(disableCode.value.trim())
    toast.success('Two-factor authentication disabled.')
    disableOpen.value = false
    disableCode.value = ''
    backupCodes.value = []
  }
  catch (e) {
    disableErr.value = errMsg(e, 'Could not disable 2FA')
  }
  finally {
    busy.value = false
  }
}

async function copyCodes() {
  try {
    await navigator.clipboard.writeText(backupCodes.value.join('\n'))
    toast.success('Backup codes copied.')
  }
  catch {
    toast.error('Copy failed — select and copy manually.')
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-2xl font-bold">Security</h2>
      <p class="text-white-dark">Protect your staff account with two-factor authentication.</p>
    </div>

    <div class="panel max-w-2xl">
      <div class="mb-5 flex items-center justify-between border-b border-white-light pb-4 dark:border-[#1b2e4b]">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <icon-lock-dots class="h-5 w-5" />
          </span>
          <div>
            <h5 class="text-lg font-semibold">Authenticator app (TOTP)</h5>
            <p class="text-sm text-white-dark">Use Google Authenticator, Authy, 1Password, or Bitwarden.</p>
          </div>
        </div>
        <span v-if="enabled" class="badge badge-outline-success">Enabled</span>
        <span v-else class="badge badge-outline-warning">Disabled</span>
      </div>

      <!-- Enabled, idle -->
      <div v-if="enabled && phase === 'idle'" class="space-y-4">
        <div class="flex items-center gap-2 rounded-md bg-success-light p-3 text-sm text-success dark:bg-success/10">
          <icon-circle-check class="h-5 w-5 shrink-0" />
          <span>Two-factor authentication is active. You'll be asked for a code at every sign-in.</span>
        </div>

        <div v-if="backupCodes.length" class="rounded-md border border-warning/40 bg-warning-light p-4 dark:bg-warning/10">
          <div class="mb-2 flex items-center justify-between">
            <h6 class="font-semibold">Your backup codes</h6>
            <button type="button" class="btn btn-sm btn-outline-primary" @click="copyCodes">
              <icon-copy class="h-4 w-4 ltr:mr-1 rtl:ml-1" /> Copy
            </button>
          </div>
          <p class="mb-3 text-xs text-white-dark">Each code works once. Store them somewhere safe — they're shown only now.</p>
          <div class="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-5">
            <code v-for="c in backupCodes" :key="c" class="rounded bg-white px-2 py-1 text-center dark:bg-[#0e1726]">{{ c }}</code>
          </div>
        </div>

        <button type="button" class="btn btn-outline-danger" @click="disableOpen = true; disableCode = ''; disableErr = ''">
          Disable two-factor authentication
        </button>
      </div>

      <!-- Disabled, idle -->
      <div v-else-if="!enabled && phase === 'idle'" class="space-y-4">
        <p class="text-sm text-white-dark">
          Add a second step to your sign-in. You'll scan a QR code with an authenticator app and confirm a code.
        </p>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="startEnrol">
          {{ busy ? 'Preparing…' : 'Enable two-factor authentication' }}
        </button>
      </div>

      <!-- Enrolling -->
      <div v-else-if="phase === 'enrolling'" class="space-y-5">
        <ol class="list-inside list-decimal space-y-4 text-sm">
          <li>
            <span class="font-semibold">Scan this QR code</span> with your authenticator app.
            <div class="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div class="h-48 w-48 shrink-0 rounded-lg bg-white p-2 [&_svg]:h-full [&_svg]:w-full" v-html="qrSvg" />
              <div class="text-xs text-white-dark">
                <p class="mb-1">Can't scan? Enter this key manually:</p>
                <code class="break-all rounded bg-white-light px-2 py-1 font-mono dark:bg-[#0e1726]">{{ secret }}</code>
              </div>
            </div>
          </li>
          <li>
            <span class="font-semibold">Save your backup codes</span> — used if you lose your device.
            <div class="mt-2 rounded-md border border-warning/40 bg-warning-light p-3 dark:bg-warning/10">
              <div class="mb-2 flex items-center justify-end">
                <button type="button" class="btn btn-sm btn-outline-primary" @click="copyCodes">
                  <icon-copy class="h-4 w-4 ltr:mr-1 rtl:ml-1" /> Copy
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-5">
                <code v-for="c in backupCodes" :key="c" class="rounded bg-white px-2 py-1 text-center dark:bg-[#0e1726]">{{ c }}</code>
              </div>
            </div>
          </li>
          <li>
            <span class="font-semibold">Enter a code</span> from the app to finish.
            <div class="mt-2 max-w-xs">
              <input
                v-model="confirmCode"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="123456"
                class="form-input tracking-widest"
              >
            </div>
          </li>
        </ol>

        <div v-if="err" class="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{{ err }}</div>

        <div class="flex gap-2">
          <button type="button" class="btn btn-primary" :disabled="busy" @click="confirmEnrol">
            {{ busy ? 'Verifying…' : 'Verify & enable' }}
          </button>
          <button type="button" class="btn btn-outline-danger" :disabled="busy" @click="cancelEnrol">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Disable modal -->
    <div v-if="disableOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-10">
      <div class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
          <h5 class="text-lg font-bold dark:text-white-light">Disable two-factor authentication</h5>
          <button type="button" class="text-gray-400 hover:text-gray-800 dark:hover:text-gray-600" @click="disableOpen = false">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="submitDisable">
          <p class="text-sm text-white-dark">Enter a current code from your authenticator app to confirm.</p>
          <input
            v-model="disableCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="123456"
            class="form-input tracking-widest"
            required
          >
          <div v-if="disableErr" class="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{{ disableErr }}</div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-outline-danger" @click="disableOpen = false">Cancel</button>
            <button type="submit" class="btn btn-danger" :disabled="busy">{{ busy ? 'Disabling…' : 'Disable 2FA' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
