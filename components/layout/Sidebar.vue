<template>
    <div :class="{ 'dark text-white-dark': store.semidark }">
        <nav class="sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300">
            <div class="h-full bg-white dark:bg-[#0e1726]">
                <div class="flex items-center justify-between px-4 py-3">
                    <NuxtLink to="/app" class="main-logo flex shrink-0 items-center">
                        <span class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white">
                            <icon-orb class="h-5 w-5" />
                        </span>
                        <span class="align-middle text-2xl font-semibold ltr:ml-2 rtl:mr-2 dark:text-white-light lg:inline">Orb</span>
                    </NuxtLink>
                    <a
                        href="javascript:;"
                        class="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 hover:text-primary rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                        @click="store.toggleSidebar()"
                    >
                        <icon-carets-down class="m-auto rotate-90" />
                    </a>
                </div>
                <client-only>
                    <perfect-scrollbar
                        :options="{ swipeEasing: true, wheelPropagation: false }"
                        class="relative h-[calc(100vh-80px)]"
                    >
                        <ul class="relative space-y-0.5 p-4 py-0 font-semibold">
                            <h2 class="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <icon-minus class="hidden h-5 w-4 flex-none" />
                                <span>Overview</span>
                            </h2>

                            <li v-for="item in primary" :key="item.to" class="nav-item">
                                <NuxtLink :to="item.to" class="group" :class="{ active: isActive(item.to, item.exact) }" @click="toggleMobileMenu">
                                    <div class="flex items-center">
                                        <component :is="item.icon" class="shrink-0 group-hover:!text-primary" />
                                        <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{{ item.label }}</span>
                                    </div>
                                </NuxtLink>
                            </li>

                            <h2 class="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <icon-minus class="hidden h-5 w-4 flex-none" />
                                <span>Developers</span>
                            </h2>

                            <!-- Collapsible group, using the theme's own sub-menu
                                 pattern. The developer pages used to replace the
                                 whole sidebar with their own, which meant leaving
                                 the section to reach anything else. -->
                            <li class="menu nav-item">
                                <button
                                    type="button"
                                    class="nav-link group w-full"
                                    :class="{ active: devOpen }"
                                    @click="devOpen = !devOpen"
                                >
                                    <div class="flex items-center">
                                        <icon-code class="shrink-0 group-hover:!text-primary" />
                                        <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">API &amp; Integration</span>
                                    </div>
                                    <div :class="{ '-rotate-90 rtl:rotate-90': !devOpen }">
                                        <icon-caret-down />
                                    </div>
                                </button>
                                <VueCollapsible :is-open="devOpen">
                                    <ul class="sub-menu text-gray-500">
                                        <li v-for="item in developerItems" :key="item.to">
                                            <NuxtLink :to="item.to" :class="{ active: isActive(item.to, item.exact) }" @click="toggleMobileMenu">
                                                <div class="flex items-center gap-2">
                                                    <component :is="item.icon" class="h-4 w-4 shrink-0" />
                                                    <span>{{ item.label }}</span>
                                                </div>
                                            </NuxtLink>
                                        </li>
                                    </ul>
                                </VueCollapsible>
                            </li>

                            <template v-if="adminItems.length">
                                <h2 class="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                    <icon-minus class="hidden h-5 w-4 flex-none" />
                                    <span>Administration</span>
                                </h2>

                                <li v-for="item in adminItems" :key="item.to" class="nav-item">
                                    <NuxtLink :to="item.to" class="group" :class="{ active: isActive(item.to, item.exact) }" @click="toggleMobileMenu">
                                        <div class="flex items-center">
                                            <component :is="item.icon" class="shrink-0 group-hover:!text-primary" />
                                            <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{{ item.label }}</span>
                                        </div>
                                    </NuxtLink>
                                </li>
                            </template>
                        </ul>
                    </perfect-scrollbar>
                </client-only>
            </div>
        </nav>
    </div>
</template>

<script lang="ts" setup>
    import { computed } from 'vue';
    import { useRoute } from 'vue-router';
    import { useAppStore } from '@/stores/index';
    import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard.vue';
    import IconMenuMailbox from '@/components/icon/menu/icon-menu-mailbox.vue';
    import IconGlobe from '@/components/icon/icon-globe.vue';
    import IconMenuUsers from '@/components/icon/menu/icon-menu-users.vue';
    import IconCreditCard from '@/components/icon/icon-credit-card.vue';
    import IconCode from '@/components/icon/icon-code.vue';
    import IconBolt from '@/components/icon/icon-bolt.vue';
    import IconLock from '@/components/icon/icon-lock.vue';
    import IconRouter from '@/components/icon/icon-router.vue';
    import IconListCheck from '@/components/icon/icon-list-check.vue';
    import IconBook from '@/components/icon/icon-book.vue';
    // Same component the theme's own sidebar uses for its sub-menus.
    import VueCollapsible from 'vue-height-collapsible/vue3';

    const store = useAppStore();
    const route = useRoute();
    const { user } = useAuth();

    const isManager = computed(() => user.value?.role === 'owner' || user.value?.role === 'admin');

    const developerItems = [
        { to: '/app/developers', label: 'Quick Setup', icon: IconBolt, exact: true },
        { to: '/app/developers/credentials', label: 'API Credentials', icon: IconLock, exact: false },
        { to: '/app/developers/webhooks', label: 'Webhook Integration', icon: IconRouter, exact: false },
        { to: '/app/developers/events', label: 'Webhook Events', icon: IconListCheck, exact: false },
        { to: '/app/developers/reference', label: 'API Reference', icon: IconCode, exact: false },
        { to: '/app/developers/documentation', label: 'API Documentation', icon: IconBook, exact: false },
    ];

    // Open by default while you are inside the section, so the current page is
    // visible in context instead of hidden behind a collapsed group.
    const devOpen = ref(route.path.startsWith('/app/developers'));
    watch(
        () => route.path,
        (p) => {
            if (p.startsWith('/app/developers')) devOpen.value = true;
        },
    );

    // API Keys, Webhooks and Settings live in the top-right user dropdown now.
    const primary = [
        { to: '/app', label: 'Dashboard', icon: IconMenuDashboard, exact: true },
        { to: '/app/emails', label: 'Emails', icon: IconMenuMailbox, exact: false },
        { to: '/app/domains', label: 'Domains', icon: IconGlobe, exact: false },
    ];

    // Manager-only. Empty for members → the Administration header is hidden.
    const adminItems = computed(() => {
        const items: any[] = [];
        if (isManager.value) {
            items.push({ to: '/app/users', label: 'Team', icon: IconMenuUsers, exact: false });
            items.push({ to: '/app/billing', label: 'Billing', icon: IconCreditCard, exact: false });
        }
        return items;
    });

    const isActive = (to: string, exact: boolean) => {
        if (exact) return route.path === to;
        return route.path === to || route.path.startsWith(to + '/');
    };

    const toggleMobileMenu = () => {
        if (window.innerWidth < 1024) {
            store.toggleSidebar();
        }
    };
</script>
