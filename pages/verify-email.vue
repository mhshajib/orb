<script setup lang="ts">
import { onMounted, ref } from 'vue'

definePageMeta({ layout: 'auth-layout' })
useHead({ title: 'Verify email' })

const route = useRoute()
const state = ref<'verifying' | 'success' | 'error'>('verifying')
const token = String(route.query.token ?? '')

onMounted(async () => {
  if (!token) { state.value = 'error'; return }
  try {
    await $fetch('/api/auth/verify-email', { method: 'POST', body: { token } })
    state.value = 'success'
  }
  catch {
    state.value = 'error'
  }
})
</script>

<template>
    <AuthCard
        :title="state === 'success' ? 'Email verified' : state === 'error' ? 'Verification failed' : 'Verifying…'"
        :subtitle="state === 'verifying' ? 'Confirming your email address.' : ''"
    >
        <div class="flex flex-col items-center gap-5 py-2 text-center">
            <template v-if="state === 'verifying'">
                <icon-loader class="h-10 w-10 animate-spin text-primary" />
            </template>

            <template v-else-if="state === 'success'">
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-success-light text-success"><icon-circle-check class="h-9 w-9" /></div>
                <p class="text-white-dark">Your email is confirmed — you can now sign in to your Orb account.</p>
                <NuxtLink to="/login?notice=verified" class="btn btn-gradient w-full border-0 uppercase">Sign in</NuxtLink>
            </template>

            <template v-else>
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-danger-light text-danger"><icon-x-circle class="h-9 w-9" /></div>
                <p class="text-white-dark">This verification link is invalid or has expired. Go to sign in and request a fresh link.</p>
                <NuxtLink to="/login" class="btn btn-outline-primary w-full">Go to login</NuxtLink>
            </template>
        </div>
    </AuthCard>
</template>
