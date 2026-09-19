<template>
    <div class="mx-auto max-w-4xl">
        <div class="mb-6">
            <h1 class="text-2xl font-bold dark:text-white-light">Quick Setup</h1>
            <p class="mt-1 text-white-dark">From zero to a delivered email in three steps.</p>
        </div>

        <ol class="space-y-5">
            <li v-for="(step, i) in steps" :key="step.title" class="panel">
                <div class="flex items-start gap-4">
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">{{ i + 1 }}</span>
                    <div class="min-w-0 flex-1">
                        <h2 class="text-base font-bold dark:text-white-light">{{ step.title }}</h2>
                        <p class="mt-1 text-white-dark">{{ step.body }}</p>
                        <NuxtLink v-if="step.to" :to="step.to" class="btn btn-outline-primary btn-sm mt-3">{{ step.cta }}</NuxtLink>
                    </div>
                </div>
            </li>
        </ol>

        <div class="panel mt-5">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 class="text-base font-bold dark:text-white-light">Send your first email</h2>
                    <p class="text-white-dark">Once a domain is verified, this is the whole integration.</p>
                </div>
                <OrbLanguageTabs v-model="language" />
            </div>
            <OrbCodeBlock :code="sample" :language="hljsLang" title="Request" />
            <OrbCodeBlock class="mt-4" :code="responseText" language="json" title="Response" :badge="String(sendEndpoint?.responseStatus ?? 201)" />
        </div>

        <div class="panel mt-5">
            <h2 class="text-base font-bold dark:text-white-light">Base URL &amp; authentication</h2>
            <p class="mt-1 text-white-dark">Every request goes to <span class="font-mono">{{ API_BASE }}</span> over HTTPS.</p>
            <pre class="mt-3 whitespace-pre-wrap rounded-md bg-[#fbfbfb] p-4 font-mono text-xs dark:bg-[#1a2941]">{{ AUTH_NOTE }}</pre>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { API_BASE, AUTH_NOTE, findEndpoint } from '@/utils/apiSpec';
    import { CODE_LANGUAGES, codeSample } from '@/utils/codeSamples';

    definePageMeta({ layout: 'developers' });
    useHead({ title: 'Quick Setup' });

    const language = ref('shell');
    const hljsLang = computed(() => CODE_LANGUAGES.find((l) => l.id === language.value)?.hljs ?? 'bash');
    const { apiKey } = useDeveloperKey();

    const sendEndpoint = computed(() => findEndpoint('send-email'));
    const sample = computed(() => (sendEndpoint.value ? codeSample(sendEndpoint.value, language.value, apiKey.value) : ''));
    const responseText = computed(() => JSON.stringify(sendEndpoint.value?.response, null, 2));

    const steps = [
        {
            title: 'Create an API key',
            body: 'Keys are shown once at creation and stored only as a hash, so copy it somewhere safe before closing the dialog.',
            to: '/developers/credentials',
            cta: 'Go to API Credentials',
        },
        {
            title: 'Verify a sending domain',
            body: 'Add your domain, publish the DNS records Orb gives you, then verify. Mail can only be sent from a verified domain.',
            to: '/app/domains',
            cta: 'Manage domains',
        },
        {
            title: 'Subscribe to webhooks (optional)',
            body: 'Get delivery, bounce and complaint events pushed to your app instead of polling for them.',
            to: '/developers/webhooks',
            cta: 'Set up webhooks',
        },
    ];
</script>
