<template>
    <button type="button" class="btn btn-outline-primary btn-sm gap-1" @click="copy">
        <icon-copy class="h-4 w-4" />
        <span v-if="label">{{ copied ? 'Copied' : label }}</span>
    </button>
</template>

<script lang="ts" setup>
    import { ref } from 'vue';
    const props = defineProps<{ value: string; label?: string }>();
    const copied = ref(false);
    const { success, error } = useToast();
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(props.value);
            copied.value = true;
            success('Copied to clipboard');
            setTimeout(() => (copied.value = false), 1500);
        } catch {
            error('Could not copy');
        }
    };
</script>
