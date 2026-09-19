<script setup lang="ts">
definePageMeta({ layout: 'auth-layout', middleware: 'guest' })
useHead({ title: 'Two-factor authentication' })

const route = useRoute()
const { fetchMe } = useAuth()

const mode = ref<'totp' | 'backup'>('totp')
const code = ref('')
const submitting = ref(false)
const error = ref('')

async function onSubmit() {
  if (submitting.value) return
  error.value = ''
  const value = code.value.trim()
  if (!value) {
    error.value = mode.value === 'totp' ? 'Enter your 6-digit code.' : 'Enter a backup code.'
    return
  }
  submitting.value = true
  try {
    if (mode.value === 'totp') await verify2FALogin(value)
    else await verify2FABackup(value)
    await fetchMe()
    await navigateTo(nextPath())
  }
  catch (e) {
    error.value = errMsg(e, 'Verification failed')
  }
  finally {
    submitting.value = false
  }
}

function nextPath() {
  const n = route.query.next
  return typeof n === 'string' && n.startsWith('/') ? n : '/app'
}
</script>

<template>
  <AuthCard
    title="Two-factor authentication"
    :subtitle="mode === 'totp'
      ? 'Enter the 6-digit code from your authenticator app.'
      : 'Enter one of your backup codes. Each code works only once.'"
  >
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label :for="mode === 'totp' ? 'totp' : 'backup'">
          {{ mode === 'totp' ? '6-digit code' : 'Backup code' }}
        </label>
        <input
          v-if="mode === 'totp'"
          id="totp"
          v-model="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          autofocus
          maxlength="6"
          placeholder="123456"
          class="form-input text-center text-lg tracking-[0.4em] placeholder:tracking-normal"
          required
        >
        <input
          v-else
          id="backup"
          v-model="code"
          autocomplete="off"
          autofocus
          placeholder="a1b2c3d4e5"
          class="form-input"
          required
        >
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
    </form>

    <div class="mt-4 text-center text-sm">
      <button
        v-if="mode === 'totp'"
        type="button"
        class="text-white-dark underline-offset-4 transition-colors hover:text-primary hover:underline"
        @click="mode = 'backup'; code = ''; error = ''"
      >
        Use a backup code instead
      </button>
      <button
        v-else
        type="button"
        class="text-white-dark underline-offset-4 transition-colors hover:text-primary hover:underline"
        @click="mode = 'totp'; code = ''; error = ''"
      >
        Back to authenticator code
      </button>
    </div>

    <template #footer>
      <NuxtLink to="/login" class="text-white-dark underline-offset-4 hover:text-primary hover:underline">
        Back to log in
      </NuxtLink>
    </template>
  </AuthCard>
</template>
