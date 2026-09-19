<script setup lang="ts">
definePageMeta({ layout: 'auth-layout', middleware: 'guest' })
useHead({ title: 'Set a new password' })

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const confirm = ref('')
const submitting = ref(false)
const done = ref(false)
const error = ref('')

async function onSubmit() {
  if (submitting.value) return
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  submitting.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, new_password: password.value },
    })
    done.value = true
  }
  catch (e) {
    error.value = errMsg(e, 'Could not reset password')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard title="Set a new password">
    <div v-if="!token" class="space-y-4">
      <div class="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
        Missing reset token. Open the link from your email again.
      </div>
    </div>

    <div v-else-if="done" class="space-y-4">
      <div class="rounded border border-success/40 bg-success/10 p-3 text-sm text-success">
        Password updated. You can log in with your new password.
      </div>
      <NuxtLink to="/login" class="btn btn-gradient w-full">
        Continue to log in
      </NuxtLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label for="password">New password</label>
        <div class="relative text-white-dark">
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            placeholder="Enter new password"
            class="form-input ltr:pl-10 rtl:pr-10 placeholder:text-white-dark"
            required
          >
          <span class="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
            <icon-lock-dots :fill="true" />
          </span>
        </div>
      </div>
      <div>
        <label for="confirm">Confirm</label>
        <div class="relative text-white-dark">
          <input
            id="confirm"
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            minlength="8"
            placeholder="Confirm new password"
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
        {{ submitting ? 'Updating…' : 'Update password' }}
      </button>
    </form>

    <template #footer>
      <NuxtLink to="/login" class="text-white-dark underline-offset-4 hover:text-primary hover:underline">
        Back to log in
      </NuxtLink>
    </template>
  </AuthCard>
</template>
