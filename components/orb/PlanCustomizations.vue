<template>
    <div v-if="changes.length" class="overflow-hidden rounded-lg border border-white-light dark:border-[#1b2e4b]">
        <!-- Both sides are named. "10,000 -> 40,000" on its own doesn't say
             which of the two numbers the customer is actually entitled to. -->
        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-[#fbfbfb] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white-dark dark:bg-[#1a2941]">
            <div class="truncate">{{ planLabel }} plan</div>
            <div class="w-4"></div>
            <div class="truncate text-primary">Active for you</div>
        </div>

        <div
            v-for="c in changes"
            :key="c.key"
            class="border-t border-white-light px-4 py-3 dark:border-[#1b2e4b]"
        >
            <div class="text-xs text-white-dark">{{ c.label }}</div>
            <div class="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <!-- Struck through: this is what the plan publishes and what no
                     longer applies, which is the entire point of the row. -->
                <div class="min-w-0 truncate text-sm font-semibold text-white-dark line-through decoration-white-dark/50">
                    {{ c.planLabel }}
                </div>

                <!-- arrow-left rotated, as ComposeWindow does: icon-arrow-forward
                     is a curved reply-style arrow, not a plain one. -->
                <icon-arrow-left class="h-4 w-4 shrink-0 rotate-180 text-white-dark" />

                <div
                    class="flex min-w-0 items-center gap-1.5 text-sm font-bold"
                    :class="c.favourable ? 'text-success' : 'text-warning'"
                >
                    <span class="truncate">{{ c.customLabel }}</span>
                    <icon-caret-down class="h-3.5 w-3.5 shrink-0" :class="c.favourable ? 'rotate-180' : ''" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import type { CustomChange } from '@/composables/useEffectiveLimits';

    /**
     * Side-by-side view of an org's negotiated overrides against its plan's
     * published caps. Only caps that actually differ are listed, so the block
     * disappears entirely when nothing was customised.
     *
     * Shared by the dashboard and the billing page so the two can't drift into
     * quoting different numbers for the same override. Note the dashboard passes
     * `customCapChanges`, which omits the negotiated price — see the composable.
     */
    defineProps<{
        /** Rows to render, from useEffectiveLimits(). */
        changes: CustomChange[];
        /** The plan being compared against, e.g. "Business". */
        planLabel: string;
    }>();
</script>
