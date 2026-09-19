<script lang="ts" setup>
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard.vue'
// Public site header. Reads the shared auth state (each landing page calls
// fetchMe() in its setup so this renders correctly on SSR + CSR).
const { isAuthed } = useAuth()
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-white-light bg-white/80 backdrop-blur-md dark:border-[#1b2e4b] dark:bg-[#060818]/80">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/30">
          <icon-orb class="h-5 w-5" />
        </span>
        <span class="text-xl font-extrabold tracking-tight text-dark dark:text-white-light">Orb</span>
      </NuxtLink>
      <div class="flex items-center gap-2">
        <NuxtLink v-if="isAuthed" to="/app" class="btn btn-gradient btn-sm gap-2">
          <icon-menu-dashboard class="h-4 w-4" /> Go to dashboard
        </NuxtLink>
        <template v-else>
          <NuxtLink to="/login" class="btn btn-outline-primary btn-sm">Log in</NuxtLink>
          <NuxtLink to="/register" class="btn btn-gradient btn-sm">Get started</NuxtLink>
        </template>
      </div>
    </div>
  </header>
</template>
