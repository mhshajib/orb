<script setup lang="ts">
// Compose is now a Gmail-style floating window (components/orb/ComposeWindow.vue,
// mounted in the app layout). This route is kept for old links/bookmarks: it
// opens the floating composer over the mailbox and redirects there.
useHead({ title: 'Compose · Emails' })
const route = useRoute()
const { openCompose } = useCompose()

onMounted(() => {
  const reply = typeof route.query.reply === 'string' ? route.query.reply : undefined
  const draft = typeof route.query.draft === 'string' ? route.query.draft : undefined
  openCompose({ replyId: reply, draftId: draft })
  navigateTo('/app/emails', { replace: true })
})
</script>

<template>
    <div class="flex min-h-[40vh] items-center justify-center text-white-dark">
        <span class="flex items-center gap-2 text-sm"><icon-loader class="h-5 w-5 animate-spin" /> Opening composer…</span>
    </div>
</template>
