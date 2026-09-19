<script setup lang="ts">
definePageMeta({ layout: 'auth-layout', middleware: 'guest' })
useHead({ title: 'Reset your password' })

const email = ref('')
const submitting = ref(false)
const sent = ref(false)
const error = ref('')

async function onSubmit() {
  if (submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value.trim() },
    })
    sent.value = true
  }
  catch (e) {
    error.value = errMsg(e, 'Could not send reset email')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard
    title="Reset your password"
    subtitle="We'll email a reset link if an account exists for this address."
  >
    <div v-if="sent" class="space-y-4">
      <div class="rounded border border-success/40 bg-success/10 p-3 text-sm text-success">
        If an account exists for <span class="font-semibold">{{ email }}</span>, a reset link is on its way.
      </div>
      <NuxtLink to="/login" class="btn btn-gradient w-full">
        Back to log in
      </NuxtLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label for="email">Email</label>
        <div class="relative text-white-dark">
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="Enter email"
            class="form-input ltr:pl-10 rtl:pr-10 placeholder:text-white-dark"
            required
          >
          <span class="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
            <icon-mail :fill="true" />
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
        {{ submitting ? 'Sending…' : 'Send reset link' }}
      </button>
    </form>

    <template #footer>
      <NuxtLink to="/login" class="text-white-dark underline-offset-4 hover:text-primary hover:underline">
        Back to log in
      </NuxtLink>
    </template>
  </AuthCard>
</template>
