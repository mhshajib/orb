<template>
    <div class="main-section font-nunito text-sm font-normal text-black antialiased dark:text-white-dark">
        <NuxtPage />
    </div>
</template>

<script lang="ts" setup>
    import { onMounted } from 'vue';
    import appSetting from '@/app-setting';
    import { useAppStore } from '@/stores/index';
    const store = useAppStore();
    const { setLocale } = useI18n();
    onMounted(() => {
        appSetting.init(setLocale);
        store.toggleMainLoader();
    });
</script>
