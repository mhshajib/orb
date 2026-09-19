<template>
    <div
        class="main-section relative font-nunito text-sm font-normal antialiased"
        :class="[store.sidebar ? 'toggle-sidebar' : '', store.menu, store.layout, store.rtlClass]"
    >
        <!--  BEGIN MAIN CONTAINER  -->
        <div class="relative">
            <!-- sidebar menu overlay -->
            <div class="fixed inset-0 z-50 bg-[black]/60 lg:hidden" :class="{ hidden: !store.sidebar }" @click="store.toggleSidebar()"></div>

            <!-- screen loader -->
            <div
                v-show="store.isShowMainLoader"
                class="screen_loader animate__animated fixed inset-0 z-[60] grid place-content-center bg-[#fafafa] dark:bg-[#060818]"
            >
                <svg width="64" height="64" viewBox="0 0 135 135" xmlns="http://www.w3.org/2000/svg" fill="#4361ee">
                    <path
                        d="M67.447 58c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10zm9.448 9.447c0 5.523 4.477 10 10 10 5.522 0 10-4.477 10-10s-4.478-10-10-10c-5.523 0-10 4.477-10 10zm-9.448 9.448c-5.523 0-10 4.477-10 10 0 5.522 4.477 10 10 10s10-4.478 10-10c0-5.523-4.477-10-10-10zM58 67.447c0-5.523-4.477-10-10-10s-10 4.477-10 10 4.477 10 10 10 10-4.477 10-10z"
                    >
                        <animateTransform attributeName="transform" type="rotate" from="0 67 67" to="-360 67 67" dur="2.5s" repeatCount="indefinite" />
                    </path>
                    <path
                        d="M28.19 40.31c6.627 0 12-5.374 12-12 0-6.628-5.373-12-12-12-6.628 0-12 5.372-12 12 0 6.626 5.372 12 12 12zm30.72-19.825c4.686 4.687 12.284 4.687 16.97 0 4.686-4.686 4.686-12.284 0-16.97-4.686-4.687-12.284-4.687-16.97 0-4.687 4.686-4.687 12.284 0 16.97zm35.74 7.705c0 6.627 5.37 12 12 12 6.626 0 12-5.373 12-12 0-6.628-5.374-12-12-12-6.63 0-12 5.372-12 12zm19.822 30.72c-4.686 4.686-4.686 12.284 0 16.97 4.687 4.686 12.285 4.686 16.97 0 4.687-4.686 4.687-12.284 0-16.97-4.685-4.687-12.283-4.687-16.97 0zm-7.704 35.74c-6.627 0-12 5.37-12 12 0 6.626 5.373 12 12 12s12-5.374 12-12c0-6.63-5.373-12-12-12zm-30.72 19.822c-4.686-4.686-12.284-4.686-16.97 0-4.686 4.687-4.686 12.285 0 16.97 4.686 4.687 12.284 4.687 16.97 0 4.687-4.685 4.687-12.283 0-16.97zm-35.74-7.704c0-6.627-5.372-12-12-12-6.626 0-12 5.373-12 12s5.374 12 12 12c6.628 0 12-5.373 12-12zm-19.823-30.72c4.687-4.686 4.687-12.284 0-16.97-4.686-4.686-12.284-4.686-16.97 0-4.687 4.686-4.687 12.284 0 16.97 4.686 4.687 12.284 4.687 16.97 0z"
                    >
                        <animateTransform attributeName="transform" type="rotate" from="0 67 67" to="360 67 67" dur="8s" repeatCount="indefinite" />
                    </path>
                </svg>
            </div>

            <div class="fixed bottom-6 z-50 ltr:right-6 rtl:left-6">
                <template v-if="showTopButton">
                    <button
                        type="button"
                        class="btn btn-outline-primary animate-pulse rounded-full bg-[#fafafa] p-2 dark:bg-[#060818] dark:hover:bg-primary"
                        @click="goToTop"
                    >
                        <svg width="24" height="24" class="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                opacity="0.5"
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M12 20.75C12.4142 20.75 12.75 20.4142 12.75 20L12.75 10.75L11.25 10.75L11.25 20C11.25 20.4142 11.5858 20.75 12 20.75Z"
                                fill="currentColor"
                            />
                            <path
                                d="M6.00002 10.75C5.69667 10.75 5.4232 10.5673 5.30711 10.287C5.19103 10.0068 5.25519 9.68417 5.46969 9.46967L11.4697 3.46967C11.6103 3.32902 11.8011 3.25 12 3.25C12.1989 3.25 12.3897 3.32902 12.5304 3.46967L18.5304 9.46967C18.7449 9.68417 18.809 10.0068 18.6929 10.287C18.5768 10.5673 18.3034 10.75 18 10.75L6.00002 10.75Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </template>
            </div>

            <!-- BEGIN APP SETTING LAUNCHER -->
            <theme-customizer />
            <!-- END APP SETTING LAUNCHER -->

            <div class="main-container min-h-screen text-black dark:text-white-dark" :class="[store.navbar]">
                <!--  BEGIN SIDEBAR  -->
                <layout-sidebar />
                <!--  END SIDEBAR  -->

                <div class="main-content flex flex-col min-h-screen">
                    <!--  BEGIN TOP NAVBAR  -->
                    <layout-header />
                    <!--  END TOP NAVBAR  -->

                    <!--  BEGIN CONTENT AREA  -->
                    <div class="animation p-6">
                        <client-only>
                            <div v-if="needsVerify" class="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning-light p-4 text-sm dark:bg-warning/10">
                                <icon-info-circle class="h-5 w-5 shrink-0 text-warning" />
                                <span class="flex-1 text-dark dark:text-white-light">
                                    Verify your email to start sending. We sent a link to <span class="font-semibold">{{ self?.email }}</span>.
                                </span>
                                <button type="button" class="btn btn-warning btn-sm" :disabled="resending" @click="resendVerification">
                                    {{ resending ? 'Sending…' : 'Resend email' }}
                                </button>
                            </div>
                        </client-only>
                        <NuxtPage />
                    </div>
                    <!--  END CONTENT AREA  -->

                    <!-- BEGIN FOOTER -->
                    <layout-footer />
                    <!-- END FOOTER -->
                </div>
            </div>

            <!-- Gmail-style floating composer, overlays any app page -->
            <client-only>
                <orb-compose-window v-if="composeOpen" :key="composeInstance" />
            </client-only>
        </div>
    </div>
</template>
<script setup lang="ts">
    import { computed, ref, onMounted } from 'vue';
    import appSetting from '@/app-setting';
    import { useAppStore } from '@/stores/index';
    const store = useAppStore();
    const showTopButton = ref(false);
    const { setLocale } = useI18n();

    // ── Orb session bootstrap ─────────────────────────────────────────
    const unread = useUnreadEmails();
    const { self, fetchSelf } = useSelf();
    const { connect, useOn } = useRealtime();
    const { open: composeOpen, instance: composeInstance } = useCompose();
    const { success: toastOk, error: toastErr } = useToast();

    const needsVerify = computed(() => self.value?.status === 'pending_verification');
    const resending = ref(false);
    async function resendVerification() {
        if (resending.value) return;
        resending.value = true;
        try {
            await $fetch('/api/auth/resend-verification', { method: 'POST' });
            toastOk('Verification email sent — check your inbox.');
        } catch (e) {
            toastErr(errMsg(e, 'Could not resend'));
        } finally {
            resending.value = false;
        }
    }

    // Realtime → unread badge. Registered in setup so it auto-unsubscribes.
    useOn('unread_count', (d: { count: number }) => unread.set(d.count));

    onMounted(async () => {
        // set default settings
        appSetting.init(setLocale);
        // Hide the full-screen loader FIRST — nothing below may throw and leave
        // the user stranded on a blank spinner after a hard refresh.
        store.toggleMainLoader();

        // Load the signed-in user's org + profile + unread count, then open
        // the realtime channel so the header badge stays live.
        Promise.all([fetchOrg(), fetchSelf(), unread.fetchCount()]).catch(() => {});
        try {
            connect();
        } catch { /* realtime is best-effort */ }

        window.onscroll = () => {
            showTopButton.value = document.body.scrollTop > 50 || document.documentElement.scrollTop > 50;
        };

        const eleanimation: any = document.querySelector('.animation');
        eleanimation?.addEventListener('animationend', function () {
            appSetting.changeAnimation('remove');
        });
    });

    const goToTop = () => {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    };
</script>
