<template>
    <div class="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#eef2ff] via-white to-[#f1f5ff] px-6 py-10 dark:from-[#060818] dark:via-[#0e1726] dark:to-[#060818] sm:px-16">
        <div class="relative w-full max-w-[480px] rounded-2xl bg-white/90 p-8 shadow-[0_8px_40px_-12px_rgba(67,97,238,0.35)] backdrop-blur-lg dark:bg-[#0e1726]/90 sm:p-10">
            <div class="mb-8 flex flex-col items-center text-center">
                <NuxtLink to="/" class="mb-5 flex items-center gap-2">
                    <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/40">
                        <icon-orb class="h-6 w-6" />
                    </span>
                    <span class="text-3xl font-extrabold tracking-tight text-dark dark:text-white-light">Orb</span>
                </NuxtLink>
                <h1 class="text-2xl font-extrabold !leading-snug text-dark dark:text-white-light">{{ title }}</h1>
                <p v-if="subtitle" class="mt-1 text-sm font-medium text-white-dark">{{ subtitle }}</p>
            </div>

            <slot />

            <div v-if="$slots.footer" class="mt-7 text-center text-sm dark:text-white-dark">
                <slot name="footer" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    defineProps<{ title: string; subtitle?: string }>();
</script>
