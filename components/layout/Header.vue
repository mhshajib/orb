<template>
    <header class="z-40">
        <div class="shadow-sm">
            <div class="relative flex w-full items-center bg-white px-5 py-2.5 dark:bg-[#0e1726]">
                <div class="horizontal-logo flex items-center justify-between ltr:mr-2 rtl:ml-2 lg:hidden">
                    <NuxtLink to="/app" class="main-logo flex shrink-0 items-center">
                        <span class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white">
                            <icon-orb class="h-5 w-5" />
                        </span>
                        <span class="hidden align-middle text-2xl font-semibold transition-all duration-300 ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light md:inline">Orb</span>
                    </NuxtLink>
                    <a
                        href="javascript:;"
                        class="collapse-icon flex flex-none rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary ltr:ml-2 rtl:mr-2 dark:bg-dark/40 dark:text-[#d0d2d6] dark:hover:bg-dark/60 dark:hover:text-primary lg:hidden"
                        @click="store.toggleSidebar()"
                    >
                        <icon-menu class="h-5 w-5" />
                    </a>
                </div>

                <div class="hidden ltr:mr-2 rtl:ml-2 sm:block">
                    <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary" v-if="org">{{ org.plan }} plan</span>
                </div>

                <div class="flex items-center space-x-1.5 ltr:ml-auto rtl:mr-auto rtl:space-x-reverse dark:text-[#d0d2d6] sm:flex-1 ltr:sm:ml-0 sm:rtl:mr-0 lg:space-x-2">
                    <div class="sm:ltr:mr-auto sm:rtl:ml-auto"></div>

                    <!-- theme toggle -->
                    <div>
                        <a href="javascript:;" v-show="store.theme === 'light'" class="flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60" @click="store.toggleTheme('dark')">
                            <icon-sun />
                        </a>
                        <a href="javascript:;" v-show="store.theme === 'dark'" class="flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60" @click="store.toggleTheme('system')">
                            <icon-moon />
                        </a>
                        <a href="javascript:;" v-show="store.theme === 'system'" class="flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60" @click="store.toggleTheme('light')">
                            <icon-laptop />
                        </a>
                    </div>

                    <!-- inbox / unread -->
                    <div class="shrink-0">
                        <NuxtLink to="/app/emails" class="relative block rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60">
                            <icon-mail-dot />
                            <span v-if="unread > 0" class="absolute -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ltr:-right-1 rtl:-left-1">
                                {{ unread > 99 ? '99+' : unread }}
                            </span>
                        </NuxtLink>
                    </div>

                    <!-- browser push notifications -->
                    <div v-if="pushVisible" class="shrink-0">
                        <button
                            type="button"
                            class="relative block rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60"
                            :class="{ 'text-primary': pushOn }"
                            :disabled="pushStatus === 'pending'"
                            :title="pushTitle"
                            @click="togglePush"
                        >
                            <icon-bell />
                            <span v-if="pushOn" class="absolute -bottom-0.5 h-2 w-2 rounded-full bg-success ltr:-right-0.5 rtl:-left-0.5"></span>
                        </button>
                    </div>

                    <!-- user -->
                    <div class="dropdown shrink-0">
                        <client-only>
                            <Popper :placement="store.rtlClass === 'rtl' ? 'bottom-end' : 'bottom-start'" offsetDistance="8" class="!block">
                                <button type="button" class="group relative block">
                                    <img v-if="self?.avatar_url" :src="self.avatar_url" alt="avatar" class="h-9 w-9 rounded-full object-cover" />
                                    <span v-else class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">{{ initials }}</span>
                                </button>
                                <template #content="{ close }">
                                    <ul class="w-[230px] !py-0 font-semibold text-dark dark:text-white-dark dark:text-white-light/90">
                                        <li>
                                            <div class="flex items-center px-4 py-4">
                                                <img v-if="self?.avatar_url" :src="self.avatar_url" alt="avatar" class="h-10 w-10 flex-none rounded-md object-cover" />
                                                <span v-else class="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-primary/20 text-base font-semibold text-primary">{{ initials }}</span>
                                                <div class="truncate ltr:pl-4 rtl:pr-4">
                                                    <h4 class="text-base">{{ displayName || 'Account' }}</h4>
                                                    <span class="text-black/60 dark:text-dark-light/60">{{ self?.email }}</span>
                                                </div>
                                            </div>
                                        </li>
                                        <li>
                                            <NuxtLink to="/app/settings" class="dark:hover:text-white" @click="close()">
                                                <icon-user class="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> Profile &amp; Security
                                            </NuxtLink>
                                        </li>
                                        <!-- Expands in place rather than navigating away, so the
                                             six developer pages are reachable from this menu
                                             without first landing on one of them. -->
                                        <li>
                                            <button type="button" class="flex w-full items-center dark:hover:text-white" @click.stop="devOpen = !devOpen">
                                                <icon-book class="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> API &amp; Docs
                                                <icon-caret-down
                                                    class="h-4 w-4 shrink-0 transition duration-300 ltr:ml-auto rtl:mr-auto"
                                                    :class="{ '-rotate-90 rtl:rotate-90': !devOpen }"
                                                />
                                            </button>
                                            <VueCollapsible :is-open="devOpen">
                                                <ul class="space-y-0.5 border-t border-white-light py-1 dark:border-white-light/10">
                                                    <li v-for="item in developerItems" :key="item.to">
                                                        <NuxtLink
                                                            :to="item.to"
                                                            class="!py-2 text-[13px] ltr:!pl-11 rtl:!pr-11 dark:hover:text-white"
                                                            @click="close()"
                                                        >
                                                            <component :is="item.icon" class="h-4 w-4 shrink-0 ltr:mr-2 rtl:ml-2" />
                                                            {{ item.label }}
                                                        </NuxtLink>
                                                    </li>
                                                </ul>
                                            </VueCollapsible>
                                        </li>
                                        <li>
                                            <NuxtLink to="/app/api-keys" class="dark:hover:text-white" @click="close()">
                                                <icon-code class="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> API Keys
                                            </NuxtLink>
                                        </li>
                                        <li>
                                            <NuxtLink to="/app/webhooks" class="dark:hover:text-white" @click="close()">
                                                <icon-router class="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> Webhooks
                                            </NuxtLink>
                                        </li>
                                        <li>
                                            <NuxtLink to="/app/settings" class="dark:hover:text-white" @click="close()">
                                                <icon-settings class="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> Settings
                                            </NuxtLink>
                                        </li>
                                        <li>
                                            <NuxtLink to="/app/emails" class="dark:hover:text-white" @click="close()">
                                                <icon-mail class="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> Inbox
                                            </NuxtLink>
                                        </li>
                                        <li class="border-t border-white-light dark:border-white-light/10">
                                            <button type="button" class="flex w-full items-center !py-3 text-danger" @click="onLogout(close)">
                                                <icon-logout class="h-4.5 w-4.5 shrink-0 rotate-90 ltr:mr-2 rtl:ml-2" /> Sign Out
                                            </button>
                                        </li>
                                    </ul>
                                </template>
                            </Popper>
                        </client-only>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>

<script lang="ts" setup>
    import { useAppStore } from '@/stores/index';
    // The theme's own collapsible, as used by its sidebar sub-menus.
    import VueCollapsible from 'vue-height-collapsible/vue3';
    import IconBolt from '@/components/icon/icon-bolt.vue';
    import IconLock from '@/components/icon/icon-lock.vue';
    import IconRouter from '@/components/icon/icon-router.vue';
    import IconListCheck from '@/components/icon/icon-list-check.vue';
    import IconCode from '@/components/icon/icon-code.vue';
    import IconBook from '@/components/icon/icon-book.vue';

    const store = useAppStore();
    const { logout } = useAuth();
    const { self, initials, displayName } = useSelf();
    const org = useOrg();
    const { count: unread } = useUnreadEmails();

    // Browser push. The button is hidden entirely when the browser can't do it
    // or the server has no Firebase credentials — offering a toggle that can
    // never deliver anything is worse than offering nothing. It is also hidden
    // once blocked, since only the user can undo that from site settings.
    const { status: pushStatus, isOn: pushOn, enable: enablePush, disable: disablePush } = usePushNotifications();
    const pushVisible = computed(() => ['off', 'on', 'pending'].includes(pushStatus.value));
    const pushTitle = computed(() => (pushOn.value ? 'Email notifications on — click to turn off' : 'Notify me about new email'));
    const { success: pushToastOk, error: pushToastErr } = useToast();

    // Permission must be requested from a user gesture, which is exactly what
    // this click is — never call enable() on mount.
    async function togglePush() {
        if (pushOn.value) {
            await disablePush();
            pushToastOk('Email notifications turned off');
            return;
        }
        if (await enablePush()) pushToastOk("You'll be notified when new email arrives");
        else pushToastErr('Could not turn on notifications');
    }

    const route = useRoute();
    const developerItems = [
        { to: '/app/developers', label: 'Quick Setup', icon: IconBolt },
        { to: '/app/developers/credentials', label: 'API Credentials', icon: IconLock },
        { to: '/app/developers/webhooks', label: 'Webhook Integration', icon: IconRouter },
        { to: '/app/developers/events', label: 'Webhook Events', icon: IconListCheck },
        { to: '/app/developers/reference', label: 'API Reference', icon: IconCode },
        { to: '/app/developers/documentation', label: 'API Documentation', icon: IconBook },
    ];
    // Already expanded when you are inside the section, so reopening the menu
    // shows where you are rather than a collapsed row.
    const devOpen = ref(route.path.startsWith('/app/developers'));

    const onLogout = async (close: () => void) => {
        close();
        await logout();
    };
</script>
