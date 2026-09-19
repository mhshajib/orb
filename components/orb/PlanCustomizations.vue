<template>
    <div v-if="changes.length">
        <!-- Tiles rather than a full-width table: a couple of changed caps
             stretched across the panel reads as an empty spreadsheet. -->
        <div
            class="grid gap-3"
            :class="dense ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'"
        >
            <div
                v-for="c in changes"
                :key="c.key"
                class="rounded-lg border border-white-light bg-[#fbfbfb] px-3 py-2.5 dark:border-[#1b2e4b] dark:bg-[#1a2941]"
            >
                <div class="truncate text-[11px] font-semibold uppercase tracking-wide text-white-dark">{{ c.label }}</div>
                <div class="mt-0.5 flex items-baseline gap-2">
                    <!-- Struck through: what the plan publishes, and what no
                         longer applies. -->
                    <span class="min-w-0 truncate text-sm font-semibold text-white-dark line-through decoration-white-dark/50">
                        {{ c.planLabel }}
                    </span>
                    <span
                        class="shrink-0 truncate text-lg font-bold"
                        :class="c.favourable ? 'text-success' : 'text-warning'"
                    >
                        {{ c.customLabel }}
                    </span>
                </div>
            </div>
        </div>

        <p class="mt-2 text-[11px] text-white-dark">
            Struck through is the {{ planLabel }} plan's published limit.
        </p>
    </div>
</template>

<script lang="ts" setup>
    import type { CustomChange } from '@/composables/useEffectiveLimits';

    /**
     * An org's negotiated overrides against its plan's published caps. Only caps
     * that actually differ are listed, so the block disappears entirely when
     * nothing was customised.
     *
     * Shared by the dashboard and the billing page so the two can't drift into
     * quoting different numbers for the same override. Note the dashboard passes
     * `customCapChanges`, which omits the negotiated price — see the composable.
     */
    withDefaults(
        defineProps<{
            /** Rows to render, from useEffectiveLimits(). */
            changes: CustomChange[];
            /** The plan being compared against, e.g. "Business". */
            planLabel: string;
            /** One column, for a narrow container like the dashboard's side panel. */
            dense?: boolean;
        }>(),
        { dense: false },
    );
</script>
