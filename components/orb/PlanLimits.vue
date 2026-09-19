<template>
    <!-- Tiles rather than full-width rows: five label/value pairs stretched
         across a wide panel put the number a mile from its label. -->
    <div
        v-if="rows.length"
        class="grid gap-3"
        :class="dense ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'"
    >
        <div
            v-for="r in rows"
            :key="r.key"
            class="rounded-lg border border-white-light bg-[#fbfbfb] px-3 py-2.5 dark:border-[#1b2e4b] dark:bg-[#1a2941]"
        >
            <div class="truncate text-[11px] font-semibold uppercase tracking-wide text-white-dark">{{ r.label }}</div>
            <div class="mt-0.5 truncate text-lg font-bold text-primary">{{ r.value }}</div>
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
    withDefaults(
        defineProps<{
            /** Rows to render — `limitRows` from useEffectiveLimits(). */
            rows: LimitRow[];
            /** Two columns, for a narrow container like the dashboard's side panel. */
            dense?: boolean;
        }>(),
        { dense: false },
    );
</script>
