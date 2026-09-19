<script setup lang="ts">
definePageMeta({ layout: 'auth-layout', middleware: 'guest' })
useHead({ title: 'Join your team' })

const route = useRoute()
const { fetchMe } = useAuth()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const name = ref('')
const password = ref('')
const confirm = ref('')
const submitting = ref(false)
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
    await $fetch('/api/auth/accept-invite', {
      method: 'POST',
      body: {
        token: token.value,
        password: password.value,
        ...(name.value.trim() ? { name: name.value.trim() } : {}),
      },
    })
    await fetchMe()
    await navigateTo('/app')
  }
  catch (e) {
    error.value = errMsg(e, 'Could not accept invitation')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard
    title="Join your team on Orb"
    subtitle="Set a password to finish creating your account."
  >
    <div v-if="!token" class="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
      Missing invite token. Use the link from your invitation email.
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label for="name">Your name <span class="text-xs text-white-dark">(optional)</span></label>
        <div class="relative text-white-dark">
          <input
            id="name"
            v-model="name"
            autocomplete="name"
            placeholder="Jane Doe"
            class="form-input ltr:pl-10 rtl:pr-10 placeholder:text-white-dark"
          >
          <span class="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
            <icon-user :fill="true" />
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
            autocomplete="new-password"
            minlength="8"
            placeholder="Choose a password"
            class="form-input ltr:pl-10 rtl:pr-10 placeholder:text-white-dark"
            required
          >
          <span class="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
            <icon-lock-dots :fill="true" />
          </span>
        </div>
      </div>
      <div>
        <label for="confirm">Confirm password</label>
        <div class="relative text-white-dark">
          <input
            id="confirm"
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            minlength="8"
            placeholder="Confirm password"
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
        {{ submitting ? 'Accepting…' : 'Accept invitation' }}
      </button>
    </form>
  </AuthCard>
</template>
