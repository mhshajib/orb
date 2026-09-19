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
                                <NuxtLink to="/platform" class="main-logo flex shrink-0 items-center">
                                    <span class="flex h-8 w-8 items-center justify-center rounded-md bg-dark text-white">
                                        <icon-orb class="h-5 w-5" />
                                    </span>
                                    <span class="align-middle text-xl font-semibold ltr:ml-2 rtl:mr-2 dark:text-white-light">Orb Staff</span>
                                </NuxtLink>
                                <a href="javascript:;" class="collapse-icon flex h-8 w-8 items-center rounded-full hover:bg-gray-500/10 hover:text-primary rtl:rotate-180 dark:text-white-light" @click="store.toggleSidebar()">
                                    <icon-carets-down class="m-auto rotate-90" />
                                </a>
                            </div>
                            <ul class="relative space-y-0.5 p-4 py-0 font-semibold">
                                <h2 class="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]"><span>Platform</span></h2>
                                <li class="nav-item">
                                    <NuxtLink to="/platform" class="group" :class="{ active: route.path === '/platform' }">
                                        <div class="flex items-center">
                                            <icon-menu-dashboard class="shrink-0 group-hover:!text-primary" />
                                            <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Organizations</span>
                                        </div>
                                    </NuxtLink>
                                </li>
                                <li class="nav-item">
                                    <NuxtLink to="/platform/audit" class="group" :class="{ active: route.path.startsWith('/platform/audit') }">
                                        <div class="flex items-center">
                                            <icon-clipboard-text class="shrink-0 group-hover:!text-primary" />
                                            <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Audit Log</span>
                                        </div>
                                    </NuxtLink>
                                </li>

                                <h2 class="-mx-4 mb-1 mt-2 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]"><span>Orb infrastructure</span></h2>
                                <li class="nav-item">
                                    <NuxtLink to="/platform/domains" class="group" :class="{ active: route.path.startsWith('/platform/domains') }">
                                        <div class="flex items-center">
                                            <icon-globe class="shrink-0 group-hover:!text-primary" />
                                            <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Domains</span>
                                        </div>
                                    </NuxtLink>
                                </li>
                                <li class="nav-item">
                                    <NuxtLink to="/platform/mailboxes" class="group" :class="{ active: route.path.startsWith('/platform/mailboxes') }">
                                        <div class="flex items-center">
                                            <icon-mail class="shrink-0 group-hover:!text-primary" />
                                            <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Mailboxes</span>
                                        </div>
                                    </NuxtLink>
                                </li>
                                <li v-if="isSuperAdmin" class="nav-item">
                                    <NuxtLink to="/platform/plans" class="group" :class="{ active: route.path.startsWith('/platform/plans') }">
                                        <div class="flex items-center">
                                            <icon-credit-card class="shrink-0 group-hover:!text-primary" />
                                            <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Pricing plans</span>
                                        </div>
                                    </NuxtLink>
                                </li>
                                <li v-if="isSuperAdmin" class="nav-item">
                                    <NuxtLink to="/platform/staff" class="group" :class="{ active: route.path.startsWith('/platform/staff') }">
                                        <div class="flex items-center">
                                            <icon-users-group class="shrink-0 group-hover:!text-primary" />
                                            <span class="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Staff</span>
                                        </div>
                                    </NuxtLink>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </div>

                <div class="main-content flex min-h-screen flex-col">
                    <!-- Header -->
                    <header class="z-40">
                        <div class="shadow-sm">
                            <div class="relative flex w-full items-center bg-white px-5 py-2.5 dark:bg-[#0e1726]">
                                <a href="javascript:;" class="collapse-icon flex flex-none rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 lg:hidden" @click="store.toggleSidebar()">
                                    <icon-menu class="h-5 w-5" />
                                </a>
                                <div class="ltr:ml-2 rtl:mr-2"><span class="rounded-full bg-dark/10 px-3 py-1 text-xs font-semibold uppercase text-dark dark:text-white-light">Staff Console</span></div>
                                <div class="flex items-center space-x-2 ltr:ml-auto rtl:mr-auto rtl:space-x-reverse">
                                    <a href="javascript:;" v-show="store.theme === 'light'" class="flex rounded-full bg-white-light/40 p-2 hover:text-primary dark:bg-dark/40" @click="store.toggleTheme('dark')"><icon-sun /></a>
                                    <a href="javascript:;" v-show="store.theme !== 'light'" class="flex rounded-full bg-white-light/40 p-2 hover:text-primary dark:bg-dark/40" @click="store.toggleTheme('light')"><icon-moon /></a>
                                    <div class="dropdown shrink-0">
                                        <client-only>
                                            <Popper :placement="store.rtlClass === 'rtl' ? 'bottom-end' : 'bottom-start'" offsetDistance="8" class="!block">
                                                <button type="button" class="group relative block">
                                                    <span class="flex h-9 w-9 items-center justify-center rounded-full bg-dark/20 text-sm font-semibold text-dark dark:text-white-light">{{ staffInitials }}</span>
                                                </button>
                                                <template #content="{ close }">
                                                    <ul class="w-[240px] !py-0 font-semibold text-dark dark:text-white-dark dark:text-white-light/90">
                                                        <li>
                                                            <div class="px-4 py-4">
                                                                <h4 class="text-sm">{{ pUser?.email }}</h4>
                                                                <span class="text-xs text-primary">{{ roleLabel }}</span>
                                                            </div>
                                                        </li>
                                                        <li class="border-t border-white-light dark:border-white-light/10">
                                                            <button type="button" class="flex w-full items-center !py-3" @click="openChangePw(close)">
                                                                <icon-lock class="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> Change password
                                                            </button>
                                                        </li>
                                                        <li class="border-t border-white-light dark:border-white-light/10">
                                                            <NuxtLink to="/platform/security" class="flex w-full items-center !py-3" @click="close()">
                                                                <icon-lock-dots class="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> Two-factor auth
                                                                <span v-if="pUser?.twofa_enabled" class="badge badge-outline-success ltr:ml-auto rtl:mr-auto">On</span>
                                                                <span v-else class="badge badge-outline-warning ltr:ml-auto rtl:mr-auto">Off</span>
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

                    <div class="p-6">
                        <client-only>
                            <div v-if="mustChange" class="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning-light p-4 text-sm dark:bg-warning/10">
                                <icon-lock class="h-5 w-5 shrink-0 text-warning" />
                                <span class="flex-1 text-dark dark:text-white-light">You're using the initial setup password. Set a new password to secure your owner account.</span>
                                <button type="button" class="btn btn-warning btn-sm" @click="pwOpen = true">Change password</button>
                            </div>
                        </client-only>
                        <NuxtPage />
                    </div>
                </div>
            </div>

            <!-- Change password modal -->
            <div v-if="pwOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-10">
                <div class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
                    <div class="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                        <h5 class="text-lg font-bold dark:text-white-light">Change password</h5>
                        <button type="button" class="text-gray-400 hover:text-gray-800 dark:hover:text-gray-600" @click="pwOpen = false"><icon-x class="h-5 w-5" /></button>
                    </div>
                    <form class="space-y-4 p-5" @submit.prevent="submitChangePw">
                        <div>
                            <label class="mb-1.5 block font-semibold">Current password</label>
                            <input v-model="pwCurrent" type="password" class="form-input" autocomplete="current-password" required />
                        </div>
                        <div>
                            <label class="mb-1.5 block font-semibold">New password</label>
                            <input v-model="pwNew" type="password" class="form-input" autocomplete="new-password" placeholder="At least 8 characters" required />
                        </div>
                        <div>
                            <label class="mb-1.5 block font-semibold">Confirm new password</label>
                            <input v-model="pwConfirm" type="password" class="form-input" autocomplete="new-password" required />
                        </div>
                        <div v-if="pwError" class="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{{ pwError }}</div>
                        <div class="flex justify-end gap-2">
                            <button type="button" class="btn btn-outline-danger" @click="pwOpen = false">Cancel</button>
                            <button type="submit" class="btn btn-primary" :disabled="pwSaving">{{ pwSaving ? 'Saving…' : 'Update password' }}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { computed, onMounted, ref } from 'vue';
    import { useRoute } from 'vue-router';
    import appSetting from '@/app-setting';
    import { useAppStore } from '@/stores/index';

    const store = useAppStore();
    const route = useRoute();
    const { setLocale } = useI18n();
    // Apply theme + direction (sets <html dir="ltr">) so the Vristo
    // `.main-content` offset (lg:ltr:ml-[260px]) actually applies — otherwise the
    // content underlaps the fixed sidebar.
    onMounted(() => appSetting.init(setLocale));
    const { pUser, platformLogout, changePassword } = usePlatform();
    const { success, error: toastError } = useToast();

    const isSuperAdmin = computed(() => pUser.value?.role === 'platform:super_admin');
    const staffInitials = computed(() => (pUser.value?.email?.[0] ?? 'S').toUpperCase());
    const roleLabel = computed(() => (pUser.value?.role ?? '').replace('platform:', '').replace('_', ' '));
    const mustChange = computed(() => !!pUser.value?.must_change_password);

    const onLogout = async (close: () => void) => {
        close();
        await platformLogout();
    };

    // ── Change own password ───────────────────────────────────────────
    const pwOpen = ref(false);
    const pwCurrent = ref('');
    const pwNew = ref('');
    const pwConfirm = ref('');
    const pwError = ref('');
    const pwSaving = ref(false);

    function openChangePw(close: () => void) {
        close();
        pwCurrent.value = '';
        pwNew.value = '';
        pwConfirm.value = '';
        pwError.value = '';
        pwOpen.value = true;
    }

    async function submitChangePw() {
        if (pwSaving.value) return;
        pwError.value = '';
        if (pwNew.value.length < 8) { pwError.value = 'New password must be at least 8 characters.'; return; }
        if (pwNew.value !== pwConfirm.value) { pwError.value = 'Passwords do not match.'; return; }
        pwSaving.value = true;
        try {
            await changePassword(pwCurrent.value, pwNew.value);
            pwOpen.value = false;
            success('Password updated.');
        } catch (e) {
            pwError.value = errMsg(e, 'Could not change password');
            toastError(pwError.value);
        } finally {
            pwSaving.value = false;
        }
    }
</script>
