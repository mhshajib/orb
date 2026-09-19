<template>
    <div v-if="params?.length" class="overflow-hidden rounded-md border border-white-light dark:border-[#1b2e4b]">
        <table class="w-full table-auto">
            <thead class="bg-[#fbfbfb] text-xs uppercase tracking-wide dark:bg-[#1a2941]">
                <tr>
                    <th class="px-4 py-2 text-left font-semibold">{{ title }}</th>
                    <th class="px-4 py-2 text-left font-semibold">Type</th>
                    <th class="px-4 py-2 text-left font-semibold">Required</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="p in params"
                    :key="p.name"
                    class="border-t border-white-light align-top dark:border-[#1b2e4b]"
                >
                    <td class="px-4 py-3">
                        <div class="font-mono text-sm font-semibold">{{ p.name }}</div>
                        <div class="mt-0.5 text-xs text-white-dark">{{ p.description }}</div>
                    </td>
                    <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-white-dark">{{ p.type }}</td>
                    <td class="whitespace-nowrap px-4 py-3 text-xs">
                        <span v-if="p.required" class="font-semibold text-danger">required</span>
                        <span v-else class="text-white-dark">optional</span>
                        <span v-if="p.note" class="text-white-dark"> · {{ p.note }}</span>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts" setup>
    import type { ApiParam } from '@/utils/apiSpec';

    withDefaults(defineProps<{ params?: ApiParam[]; title?: string }>(), { title: 'Parameter' });
</script>
