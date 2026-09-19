<template>
    <div class="mx-auto max-w-4xl">
        <div class="mb-6">
            <h1 class="text-2xl font-bold dark:text-white-light">Webhook Events</h1>
            <p class="mt-1 text-white-dark">Everything you can subscribe to, and what each one carries.</p>
        </div>

        <div class="space-y-2">
            <div v-for="e in WEBHOOK_EVENTS" :key="e.event" class="panel !p-0">
                <button
                    type="button"
                    class="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    @click="open === e.event ? (open = null) : (open = e.event)"
                >
                    <span class="flex flex-wrap items-center gap-2">
                        <span class="font-bold dark:text-white-light">{{ e.title }}</span>
                        <code class="rounded bg-white-light/70 px-1.5 py-0.5 font-mono text-xs dark:bg-[#1b2e4b]">{{ e.event }}</code>
                    </span>
                    <icon-caret-down class="h-4 w-4 shrink-0 transition" :class="open === e.event ? 'rotate-180' : ''" />
                </button>
                <div v-if="open === e.event" class="border-t border-white-light px-5 py-4 dark:border-[#1b2e4b]">
                    <p class="mb-3 text-white-dark">{{ e.description }}</p>
                    <OrbCodeBlock :code="payloadFor(e.event)" language="json" title="Example payload" />
                </div>
            </div>
        </div>

        <div class="panel mt-5">
            <h2 class="text-base font-bold dark:text-white-light">Subscribing</h2>
            <p class="mt-1 text-white-dark">
                Choose events per endpoint when you create it — an endpoint only receives what it asked for.
            </p>
            <NuxtLink to="/app/webhooks" class="btn btn-primary btn-sm mt-3">Configure endpoints</NuxtLink>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { WEBHOOK_EVENTS } from '@/utils/apiSpec';

    definePageMeta({ layout: 'developers' });
    useHead({ title: 'Webhook Events' });

    const open = ref<string | null>(WEBHOOK_EVENTS[0]?.event ?? null);

    // The data block differs by subject: email events carry the message, domain
    // events the domain, user events the invite.
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
        if (event === 'email.bounced')
            data = { ...data, reason: 'mailbox does not exist' };

        return JSON.stringify({ event, created_at: '2026-09-19T10:05:00Z', data }, null, 2);
    }
</script>
