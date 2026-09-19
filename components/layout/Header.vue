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
                                        <li>
                                            <NuxtLink to="/developers" class="dark:hover:text-white" @click="close()">
                                                <icon-book class="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> API &amp; Docs
                                            </NuxtLink>
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

    const store = useAppStore();
    const { logout } = useAuth();
    const { self, initials, displayName } = useSelf();
    const org = useOrg();
    const { count: unread } = useUnreadEmails();

    const onLogout = async (close: () => void) => {
        close();
        await logout();
    };
</script>
