<template>
    <span class="rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide" :class="cls">{{ method }}</span>
</template>

<script lang="ts" setup>
    import type { HttpMethod } from '@/utils/apiSpec';

    const props = defineProps<{ method: HttpMethod }>();

    // Colour carries the same meaning every API console uses: green creates,
    // blue reads, amber replaces, red removes.
    const cls = computed(
        () =>
            ({
                GET: 'bg-info/15 text-info',
                POST: 'bg-success/15 text-success',
                PUT: 'bg-warning/15 text-warning',
                DELETE: 'bg-danger/15 text-danger',
            })[props.method] ?? 'bg-primary/15 text-primary',
    );
</script>
