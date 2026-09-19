<script setup lang="ts">
import type { EmailStatus } from '@/composables/useEmails'

defineProps<{ status: EmailStatus }>()

const labelByStatus: Record<EmailStatus, string> = {
  draft: 'Draft',
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
  received: 'Received',
  bounced: 'Bounced',
}

// Maps status → Vristo badge background color.
//   delivered/sent → success, sending/queued → info, bounced/failed → danger,
//   received → primary, draft → neutral.
const classByStatus: Record<EmailStatus, string> = {
  draft: 'bg-dark',
  sending: 'bg-info',
  sent: 'bg-success',
  delivered: 'bg-success',
  failed: 'bg-danger',
  received: 'bg-primary',
  bounced: 'bg-danger',
}
</script>

<template>
    <span class="badge whitespace-nowrap" :class="classByStatus[status]">{{ labelByStatus[status] }}</span>
</template>
