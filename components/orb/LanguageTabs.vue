<template>
    <!-- Theme pill-tab styling, matching the rest of the app rather than a
         bespoke button row. -->
    <ul class="flex flex-wrap items-center gap-1.5">
        <li v-for="lang in CODE_LANGUAGES" :key="lang.id">
            <button
                type="button"
                class="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition duration-300"
                :class="
                    modelValue === lang.id
                        ? 'border-primary bg-primary text-white shadow-md shadow-primary/30'
                        : 'border-white-light text-white-dark hover:border-primary hover:text-primary dark:border-[#1b2e4b]'
                "
                @click="$emit('update:modelValue', lang.id)"
            >
                {{ lang.label }}
            </button>
        </li>
    </ul>
</template>

<script lang="ts" setup>
    import { CODE_LANGUAGES } from '@/utils/codeSamples';

    defineProps<{ modelValue: string }>();
    defineEmits<{ 'update:modelValue': [string] }>();
</script>
