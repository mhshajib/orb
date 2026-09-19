<script lang="ts" setup>
const { isAuthed } = useAuth()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-white-light dark:border-[#1b2e4b]">
    <div class="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-sm text-white-dark sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div class="flex items-center gap-2.5">
        <span class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white">
          <icon-orb class="h-4 w-4" />
        </span>
        <span>© {{ year }} Orb. All rights reserved.</span>
      </div>
      <div class="flex flex-wrap items-center gap-5 font-semibold">
        <NuxtLink to="/faq" class="transition-colors hover:text-primary">FAQ</NuxtLink>
        <NuxtLink to="/terms" class="transition-colors hover:text-primary">Terms</NuxtLink>
        <NuxtLink to="/privacy" class="transition-colors hover:text-primary">Privacy</NuxtLink>
        <a href="mailto:hello@orb.bd" class="transition-colors hover:text-primary">Contact</a>
        <NuxtLink v-if="isAuthed" to="/app" class="transition-colors hover:text-primary">Dashboard</NuxtLink>
        <template v-else>
          <NuxtLink to="/login" class="transition-colors hover:text-primary">Log in</NuxtLink>
          <NuxtLink to="/register" class="transition-colors hover:text-primary">Get started</NuxtLink>
        </template>
      </div>
    </div>
  </footer>
</template>
