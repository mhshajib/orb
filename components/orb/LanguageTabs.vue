<template>
    <div class="flex flex-wrap items-center gap-1">
        <button
            v-for="lang in CODE_LANGUAGES"
            :key="lang.id"
            type="button"
            class="rounded px-2.5 py-1 text-xs font-semibold transition"
            :class="
                modelValue === lang.id
                    ? 'bg-primary text-white'
                    : 'text-white-dark hover:bg-[#1b2e4b] hover:text-white'
            "
            @click="$emit('update:modelValue', lang.id)"
        >
            {{ lang.label }}
        </button>
    </div>
</template>

<script lang="ts" setup>
    import { CODE_LANGUAGES } from '@/utils/codeSamples';

    defineProps<{ modelValue: string }>();
    defineEmits<{ 'update:modelValue': [string] }>();
</script>
