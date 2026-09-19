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

    const store = useAppStore();
    const route = useRoute();
    const { user } = useAuth();

    const isManager = computed(() => user.value?.role === 'owner' || user.value?.role === 'admin');


    // API Keys, Webhooks and Settings live in the top-right user dropdown now.
    const primary = [
        { to: '/app', label: 'Dashboard', icon: IconMenuDashboard, exact: true },
        { to: '/app/emails', label: 'Emails', icon: IconMenuMailbox, exact: false },
    ];

    // Manager-only. Empty for members → the Administration header is hidden.
    const adminItems = computed(() => {
        const items: any[] = [];
        if (isManager.value) {
            // Sending domains are org infrastructure - adding or deleting one
            // changes what everybody can send from - so they sit here rather
            // than in the primary nav.
            items.push({ to: '/app/domains', label: 'Domains', icon: IconGlobe, exact: false });
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
