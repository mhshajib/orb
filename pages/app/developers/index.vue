<template>
    <div>
        <!-- Hero: theme panel + gradient, same language as the dashboard cards -->
        <div class="panel mb-5 overflow-hidden border-0 bg-gradient-to-r from-primary to-[#805dca] p-0 text-white">
            <div class="flex flex-wrap items-center justify-between gap-6 px-6 py-7">
                <div class="min-w-0">
                    <h1 class="text-2xl font-bold">Build with Orb</h1>
                    <p class="mt-1 max-w-xl text-white/80">
                        A transactional email API for Bangladesh. Verify a domain, send over HTTPS, and get delivery
                        events pushed to your app.
                    </p>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <NuxtLink to="/app/developers/reference" class="btn btn-sm border-0 bg-white text-primary hover:bg-white/90">
                            API Reference
                        </NuxtLink>
                        <NuxtLink to="/app/developers/credentials" class="btn btn-sm border border-white/60 bg-transparent text-white hover:bg-white/10">
                            Get a key
                        </NuxtLink>
                    </div>
                </div>
                <div class="hidden shrink-0 sm:block">
                    <div class="grid h-24 w-24 place-content-center rounded-2xl bg-white/15 backdrop-blur">
                        <icon-code class="h-12 w-12" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Steps as themed cards with coloured icon tiles -->
        <div class="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div v-for="(step, i) in steps" :key="step.title" class="panel h-full">
                <div class="mb-4 flex items-center gap-3">
                    <div class="grid h-11 w-11 place-content-center rounded-xl" :class="step.tile">
                        <component :is="step.icon" class="h-5 w-5" />
                    </div>
                    <span class="badge bg-white-light text-white-dark dark:bg-[#1b2e4b]">Step {{ i + 1 }}</span>
                </div>
                <h2 class="text-base font-bold dark:text-white-light">{{ step.title }}</h2>
                <p class="mt-1 text-white-dark">{{ step.body }}</p>
                <NuxtLink :to="step.to" class="btn btn-outline-primary btn-sm mt-4">{{ step.cta }}</NuxtLink>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <!-- Send sample -->
            <div class="panel xl:col-span-2">
                <div class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white-light pb-4 dark:border-[#1b2e4b]">
                    <div>
                        <h2 class="text-lg font-bold dark:text-white-light">Send your first email</h2>
                        <p class="text-white-dark">Once a domain is verified, this is the whole integration.</p>
                    </div>
                    <OrbLanguageTabs v-model="language" />
                </div>
                <OrbCodeBlock :code="sample" :language="hljsLang" title="Request" />
                <OrbCodeBlock class="mt-4" :code="responseText" language="json" title="Response" :badge="String(sendEndpoint?.responseStatus ?? 201)" />
            </div>

            <!-- At a glance -->
            <div class="space-y-5">
                <div class="panel">
                    <h3 class="mb-4 text-base font-bold dark:text-white-light">At a glance</h3>
                    <ul class="space-y-3">
                        <li v-for="f in facts" :key="f.label" class="flex items-center justify-between gap-3 border-b border-white-light pb-3 last:border-0 last:pb-0 dark:border-[#1b2e4b]">
                            <span class="text-white-dark">{{ f.label }}</span>
                            <code class="font-mono text-xs font-semibold dark:text-white-light">{{ f.value }}</code>
                        </li>
                    </ul>
                </div>
                <div class="panel">
                    <h3 class="mb-3 text-base font-bold dark:text-white-light">Authentication</h3>
                    <p class="text-white-dark">Send your key as a bearer token on every request.</p>
                    <div class="mt-3 flex items-center gap-2 rounded-md bg-[#fbfbfb] px-3 py-2 dark:bg-[#1a2941]">
                        <code class="min-w-0 flex-1 truncate font-mono text-xs">Authorization: Bearer {{ keyPreview }}</code>
                        <OrbCopyButton :value="`Authorization: Bearer ${keyPreview}`" />
                    </div>
                    <p class="mt-2 text-xs text-white-dark">Keys are shown once at creation — Orb stores only a hash.</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { API_BASE, findEndpoint } from '@/utils/apiSpec';
    import { CODE_LANGUAGES, codeSample } from '@/utils/codeSamples';
    import IconLock from '@/components/icon/icon-lock.vue';
    import IconGlobe from '@/components/icon/icon-globe.vue';
    import IconRouter from '@/components/icon/icon-router.vue';

    useHead({ title: 'Developers' });

    const language = ref('shell');
    const hljsLang = computed(() => CODE_LANGUAGES.find((l) => l.id === language.value)?.hljs ?? 'bash');
    const { apiKey, keyPreview } = useDeveloperKey();

    const sendEndpoint = computed(() => findEndpoint('send-email'));
    const sample = computed(() => (sendEndpoint.value ? codeSample(sendEndpoint.value, language.value, apiKey.value) : ''));
    const responseText = computed(() => JSON.stringify(sendEndpoint.value?.response, null, 2));

    const steps = [
        {
            title: 'Create an API key',
            body: 'Shown once at creation and stored only as a hash — copy it somewhere safe before closing the dialog.',
            to: '/app/developers/credentials',
            cta: 'API Credentials',
            icon: IconLock,
            tile: 'bg-primary-light text-primary dark:bg-primary dark:text-white',
        },
        {
            title: 'Verify a domain',
            body: 'Add your domain, publish the DNS records, then verify. Mail only sends from a verified domain.',
            to: '/app/domains',
            cta: 'Manage domains',
            icon: IconGlobe,
            tile: 'bg-success-light text-success dark:bg-success dark:text-white',
        },
        {
            title: 'Subscribe to events',
            body: 'Get delivery, bounce and complaint events pushed to your app instead of polling for them.',
            to: '/app/developers/webhooks',
            cta: 'Set up webhooks',
            icon: IconRouter,
            tile: 'bg-warning-light text-warning dark:bg-warning dark:text-white',
        },
    ];

    const facts = [
        { label: 'Base URL', value: API_BASE },
        { label: 'Auth', value: 'Bearer token' },
        { label: 'Key prefix', value: 'orb_live_' },
        { label: 'Format', value: 'JSON' },
    ];
</script>
