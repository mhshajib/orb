<template>
    <div v-if="rows.length" class="overflow-hidden rounded-lg border border-white-light dark:border-[#1b2e4b]">
        <div
            v-for="r in rows"
            :key="r.key"
            class="flex items-center justify-between gap-3 border-b border-white-light px-4 py-2.5 last:border-b-0 dark:border-[#1b2e4b]"
        >
            <span class="min-w-0 truncate text-xs text-white-dark">{{ r.label }}</span>
            <span class="shrink-0 text-sm font-bold text-primary">{{ r.value }}</span>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import type { LimitRow } from '@/composables/useEffectiveLimits';

    /**
     * The caps that actually apply, listed plainly.
     *
     * Used where a plan-vs-negotiated comparison would be noise — an enterprise
     * org, whose published plan is "Unlimited" across the board, so every row of
     * a diff would read as a downgrade. "What are my limits" still has a useful
     * answer there; "how do they differ from the published plan" does not.
     */
    defineProps<{
        /** Rows to render — `limitRows` from useEffectiveLimits(). */
        rows: LimitRow[];
    }>();
</script>
