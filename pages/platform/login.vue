<script setup lang="ts">
definePageMeta({ layout: 'auth-layout' })
useHead({ title: 'Staff Console' })

const route = useRoute()
const toast = useToast()
const { platformLogin, verifyTwoFA } = usePlatform()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')

// Two-step 2FA state
const stage = ref<'credentials' | 'twofa'>('credentials')
const sessionToken = ref('')
const code = ref('')
const useBackup = ref(false)

function redirect() {
  const next = typeof route.query.next === 'string' && route.query.next.startsWith('/')
    ? route.query.next
    : '/platform'
  return navigateTo(next)
}

async function onSubmit() {
  if (submitting.value)
    return
  error.value = ''
  submitting.value = true
  try {
    const res = await platformLogin(email.value.trim(), password.value)
    if (res.requires2FA) {
      sessionToken.value = res.sessionToken
      stage.value = 'twofa'
      return
    }
    toast.success('Signed in')
    await redirect()
  }
  catch (e) {
    error.value = errMsg(e, 'Sign-in failed')
    toast.error(error.value)
  }
  finally {
    submitting.value = false
  }
}

async function onVerify() {
  if (submitting.value)
    return
  error.value = ''
  submitting.value = true
  try {
    await verifyTwoFA(sessionToken.value, code.value.trim(), { backup: useBackup.value })
    toast.success('Signed in')
    await redirect()
  }
  catch (e) {
    error.value = errMsg(e, 'Verification failed')
    toast.error(error.value)
  }
  finally {
    submitting.value = false
  }
}

function backToCredentials() {
  stage.value = 'credentials'
  code.value = ''
  sessionToken.value = ''
  error.value = ''
  useBackup.value = false
}
</script>

<template>
  <AuthCard title="Staff Console" subtitle="Sign in to the Orb platform admin">
    <form v-if="stage === 'credentials'" class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label for="email">Email</label>
        <div class="relative text-white-dark">
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="staff@orb.bd"
            class="form-input ltr:pl-10 rtl:pr-10 placeholder:text-white-dark"
            required
          >
          <span class="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
            <icon-mail :fill="true" />
          </span>
        </div>
      </div>
      <div>
        <label for="password">Password</label>
        <div class="relative text-white-dark">
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter password"
            class="form-input ltr:pl-10 rtl:pr-10 placeholder:text-white-dark"
            required
          >
          <span class="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
            <icon-lock-dots :fill="true" />
          </span>
        </div>
      </div>
      <div
        v-if="error"
        class="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
      >
        {{ error }}
      </div>
      <button type="submit" class="btn btn-gradient w-full" :disabled="submitting">
        {{ submitting ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <form v-else class="space-y-4" @submit.prevent="onVerify">
      <p class="text-sm text-white-dark">
        {{ useBackup
          ? 'Enter one of your backup codes.'
          : 'Enter the 6-digit code from your authenticator app.' }}
      </p>
      <div>
        <label for="code">{{ useBackup ? 'Backup code' : 'Authentication code' }}</label>
        <div class="relative text-white-dark">
          <input
            id="code"
            v-model="code"
            type="text"
            inputmode="text"
            autocomplete="one-time-code"
            :placeholder="useBackup ? 'xxxxxxxxxx' : '123456'"
            class="form-input ltr:pl-10 rtl:pr-10 tracking-widest placeholder:text-white-dark"
            required
            autofocus
          >
          <span class="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
            <icon-lock-dots :fill="true" />
          </span>
        </div>
      </div>
      <div
        v-if="error"
        class="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
      >
        {{ error }}
      </div>
      <button type="submit" class="btn btn-gradient w-full" :disabled="submitting">
        {{ submitting ? 'Verifying…' : 'Verify' }}
      </button>
      <div class="flex items-center justify-between text-sm">
        <button type="button" class="text-primary hover:underline" @click="useBackup = !useBackup; code = ''">
          {{ useBackup ? 'Use authenticator app' : 'Use a backup code' }}
        </button>
        <button type="button" class="text-white-dark hover:underline" @click="backToCredentials">
          Back
        </button>
      </div>
    </form>
  </AuthCard>
</template>
