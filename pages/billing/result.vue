<script setup lang="ts">
definePageMeta({ layout: 'auth-layout' })
useHead({ title: 'Payment result' })

const route = useRoute()
const { isAuthed } = useAuth()

const status = computed(() => String(route.query.status ?? 'error'))
const reason = computed(() => (typeof route.query.reason === 'string' ? route.query.reason : ''))

const isSuccess = computed(() => status.value === 'success')

const title = computed(() => {
  if (isSuccess.value) return 'Payment confirmed'
  if (status.value === 'failed') return 'Payment failed'
  return 'Something went wrong'
})

const body = computed(() => {
  if (isSuccess.value) return 'Your subscription is active. You can view invoices and manage your plan in billing.'
  if (status.value === 'failed') return 'The payment was not completed. Your plan has not changed. You can try again from billing.'
  if (reason.value) return `bKash reported: ${reason.value}`
  return 'We could not confirm the payment. If you were charged, contact support — no plan change has been applied yet.'
})

const continueTo = computed(() => (isAuthed.value ? '/app/billing' : '/login?next=/app/billing'))
</script>

<template>
  <AuthCard :title="title">
    <div class="space-y-5 text-center">
      <div class="flex justify-center">
        <span
          v-if="isSuccess"
          class="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <icon-circle-check class="h-9 w-9" />
        </span>
        <span
          v-else
          class="flex h-16 w-16 items-center justify-center rounded-full bg-danger/15 text-danger"
        >
          <icon-x-circle class="h-9 w-9" />
        </span>
      </div>

      <p class="text-sm text-white-dark">
        {{ body }}
      </p>

      <NuxtLink :to="continueTo" class="btn btn-gradient w-full">
        Continue
      </NuxtLink>
    </div>
  </AuthCard>
</template>
