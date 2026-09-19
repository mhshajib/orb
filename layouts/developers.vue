<template>
    <div class="main-section relative font-nunito text-sm font-normal antialiased" :class="[store.sidebar ? 'toggle-sidebar' : '', 'vertical', 'full', store.rtlClass]">
        <div class="relative">
            <div class="fixed inset-0 z-50 bg-[black]/60 lg:hidden" :class="{ hidden: !store.sidebar }" @click="store.toggleSidebar()"></div>

            <div class="main-container min-h-screen text-black dark:text-white-dark">
                <!-- Sidebar -->
                <div :class="{ 'dark text-white-dark': store.semidark }">
                    <nav class="sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300">
                        <div class="h-full bg-white dark:bg-[#0e1726]">
                            <div class="flex items-center justify-between px-4 py-3">
                                <NuxtLink to="/developers" class="main-logo flex shrink-0 items-center">
                                    <span class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white">
                                        <icon-code class="h-5 w-5" />
                                    </span>
                                    <span class="align-middle text-xl font-semibold ltr:ml-2 rtl:mr-2 dark:text-white-light">Developers</span>
                                </NuxtLink>
                                <a href="javascript:;" class="collapse-icon flex h-8 w-8 items-center rounded-full hover:bg-gray-500/10 hover:text-primary rtl:rotate-180 dark:text-white-light" @click="store.toggleSidebar()">
                                    <icon-carets-down class="m-auto rotate-90" />
                                </a>
                            </div>

                            <ul class="relative space-y-0.5 p-4 py-0 font-semibold">
                                <h2 class="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]"><span>Developer</span></h2>
                                <li v-for="item in nav" :key="item.to" class="nav-item">
                                    <NuxtLink :to="item.to" class="group" :class="{ active: isActive(item) }">
                                        <div class="flex items-center">
                                            <component :is="item.icon" class="shrink-0 group-hover:!text-primary" />
                                            <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{{ item.label }}</span>
                                        </div>
                                    </NuxtLink>
                                </li>

                                <h2 class="-mx-4 mb-1 mt-2 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]"><span>Back</span></h2>
                                <li class="nav-item">
                                    <NuxtLink to="/app" class="group">
                                        <div class="flex items-center">
                                            <IconMenuDashboard class="shrink-0 group-hover:!text-primary" />
                                            <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Back to dashboard</span>
                                        </div>
                                    </NuxtLink>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </div>

                <div class="main-content flex min-h-screen flex-col">
                    <header class="z-40">
                        <div class="shadow-sm">
                            <div class="relative flex w-full items-center bg-white px-5 py-2.5 dark:bg-black">
                                <a href="javascript:;" class="collapse-icon flex flex-none rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary ltr:mr-2 rtl:ml-2 dark:bg-dark/40 dark:text-[#d0d2d6] dark:hover:bg-dark/60 lg:hidden" @click="store.toggleSidebar()">
                                    <icon-menu class="h-5 w-5" />
                                </a>
                                <div class="ltr:mr-2 rtl:ml-2">
                                    <h2 class="text-base font-semibold dark:text-white-light">API &amp; Integration</h2>
                                </div>
                                <div class="flex items-center space-x-1.5 ltr:ml-auto rtl:mr-auto rtl:space-x-reverse dark:text-[#d0d2d6]">
                                    <NuxtLink to="/app/api-keys" class="btn btn-outline-primary btn-sm">Manage keys</NuxtLink>
                                    <NuxtLink to="/app" class="btn btn-primary btn-sm">Dashboard</NuxtLink>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div class="p-6">
                        <NuxtPage />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import appSetting from '@/app-setting';
    import { useAppStore } from '@/stores/index';
    import IconBolt from '@/components/icon/icon-bolt.vue';
    // No icon-key in this set; the padlock reads the same for credentials.
    import IconLock from '@/components/icon/icon-lock.vue';
    import IconRouter from '@/components/icon/icon-router.vue';
    import IconListCheck from '@/components/icon/icon-list-check.vue';
    import IconBook from '@/components/icon/icon-book.vue';
    import IconCode from '@/components/icon/icon-code.vue';
    import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard.vue';

    const store = useAppStore();
    const route = useRoute();
    const { setLocale } = useI18n();
    // Same reason as the platform layout: appSetting.init sets <html dir>, and
    // without it Vristo's .main-content offset never applies and the content
    // slides under the fixed sidebar.
    onMounted(() => appSetting.init(setLocale));

    const nav = [
        { to: '/developers', label: 'Quick Setup', icon: IconBolt, exact: true },
        { to: '/developers/credentials', label: 'API Credentials', icon: IconLock },
        { to: '/developers/webhooks', label: 'Webhook Integration', icon: IconRouter },
        { to: '/developers/events', label: 'Webhook Events', icon: IconListCheck },
        { to: '/developers/reference', label: 'API Reference', icon: IconCode },
        { to: '/developers/documentation', label: 'API Documentation', icon: IconBook },
    ];

    function isActive(item: { to: string; exact?: boolean }) {
        return item.exact ? route.path === item.to : route.path.startsWith(item.to);
    }
</script>
