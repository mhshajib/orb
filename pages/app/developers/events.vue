<template>
    <div>
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 class="text-2xl font-bold dark:text-white-light">Webhook Events</h1>
                <p class="mt-1 text-white-dark">Everything you can subscribe to, and what each one carries.</p>
            </div>
            <NuxtLink to="/app/webhooks" class="btn btn-primary">Configure endpoints</NuxtLink>
        </div>

        <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <!-- Accordion, using the theme's collapsible -->
            <div class="space-y-3">
                <div v-for="e in WEBHOOK_EVENTS" :key="e.event" class="panel !p-0 overflow-hidden">
                    <button type="button" class="flex w-full items-center gap-3 px-5 py-4 text-left" @click="toggle(e.event)">
                        <div class="grid h-9 w-9 shrink-0 place-content-center rounded-lg" :class="tileFor(e.event)">
                            <component :is="iconFor(e.event)" class="h-4 w-4" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="font-bold dark:text-white-light">{{ e.title }}</div>
                            <code class="font-mono text-xs text-white-dark">{{ e.event }}</code>
                        </div>
                        <icon-caret-down class="h-4 w-4 shrink-0 transition duration-300" :class="{ '-rotate-90 rtl:rotate-90': open !== e.event }" />
                    </button>
                    <VueCollapsible :is-open="open === e.event">
                        <div class="border-t border-white-light px-5 py-4 dark:border-[#1b2e4b]">
                            <p class="mb-3 text-white-dark">{{ e.description }}</p>
                            <OrbCodeBlock :code="payloadFor(e.event)" language="json" title="Example payload" />
                        </div>
                    </VueCollapsible>
                </div>
            </div>

            <!-- Reference rail -->
            <div class="space-y-5 xl:sticky xl:top-5 xl:h-fit">
                <div class="panel">
                    <h2 class="mb-3 text-base font-bold dark:text-white-light">Headers on every delivery</h2>
                    <ul class="space-y-2.5">
                        <li v-for="h in headers" :key="h.name" class="border-b border-white-light pb-2.5 last:border-0 last:pb-0 dark:border-[#1b2e4b]">
                            <code class="font-mono text-xs font-semibold text-primary">{{ h.name }}</code>
                            <p class="mt-0.5 text-xs text-white-dark">{{ h.desc }}</p>
                        </li>
                    </ul>
                </div>
                <div class="panel">
                    <h2 class="mb-2 text-base font-bold dark:text-white-light">Handling retries</h2>
                    <p class="text-sm text-white-dark">
                        A non-2xx response is retried, so the same event can arrive more than once. Key your handler on
                        <code class="font-mono text-xs">X-Orb-Delivery</code> to stay idempotent.
                    </p>
                    <NuxtLink to="/app/developers/webhooks" class="btn btn-outline-primary btn-sm mt-3">Verifying requests</NuxtLink>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import VueCollapsible from 'vue-height-collapsible/vue3';
    import { WEBHOOK_EVENTS } from '@/utils/apiSpec';
    import IconMail from '@/components/icon/icon-mail.vue';
    import IconGlobe from '@/components/icon/icon-globe.vue';
    import IconUsers from '@/components/icon/icon-users.vue';

    useHead({ title: 'Webhook Events' });

    const open = ref<string | null>(WEBHOOK_EVENTS[0]?.event ?? null);
    function toggle(e: string) {
        open.value = open.value === e ? null : e;
    }

    const headers = [
        { name: 'X-Orb-Event', desc: 'The event name, e.g. email.delivered' },
        { name: 'X-Orb-Delivery', desc: 'Unique id for this delivery attempt' },
        { name: 'X-Orb-Timestamp', desc: 'Unix seconds, signed alongside the body' },
        { name: 'X-Orb-Signature', desc: 'sha256=<hex> HMAC over "<timestamp>.<body>"' },
    ];

    // Colour and icon by subject, so the list scans by category rather than
    // being eight identical rows.
    function iconFor(e: string) {
        if (e.startsWith('domain.')) return IconGlobe;
        if (e.startsWith('user.')) return IconUsers;
        return IconMail;
    }
    function tileFor(e: string) {
        if (e.startsWith('domain.')) return 'bg-info-light text-info dark:bg-info dark:text-white';
        if (e.startsWith('user.')) return 'bg-secondary-light text-secondary dark:bg-secondary dark:text-white';
        if (e.includes('bounced') || e.includes('failed') || e.includes('complained'))
            return 'bg-danger-light text-danger dark:bg-danger dark:text-white';
        if (e.includes('delivered')) return 'bg-success-light text-success dark:bg-success dark:text-white';
        return 'bg-primary-light text-primary dark:bg-primary dark:text-white';
    }

    function payloadFor(event: string): string {
        let data: Record<string, unknown> = {
            id: '6a1f2c3d4e5f60718293a4b5',
            to: ['customer@example.com'],
            subject: 'Your invoice is ready',
            status: event.split('.')[1],
        };
        if (event.startsWith('domain.'))
            data = { id: '6a1f2c3d4e5f60718293a4b6', domain: 'yourdomain.com', status: event === 'domain.verified' ? 'verified' : 'unverified' };
        if (event.startsWith('user.'))
            data = { id: '6a1f2c3d4e5f60718293a4bb', email: 'teammate@yourdomain.com', role: 'member' };
        if (event === 'email.bounced') data = { ...data, reason: 'mailbox does not exist' };
        return JSON.stringify({ event, created_at: '2026-09-19T10:05:00Z', data }, null, 2);
    }
</script>
