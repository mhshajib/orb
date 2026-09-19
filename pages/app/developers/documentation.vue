<template>
    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <!-- Contents -->
        <aside class="panel !p-0 h-fit xl:sticky xl:top-5">
            <div class="border-b border-white-light px-4 py-3 dark:border-[#1b2e4b]">
                <h3 class="text-sm font-bold uppercase tracking-wide dark:text-white-light">Contents</h3>
            </div>
            <ul class="max-h-[70vh] space-y-0.5 overflow-y-auto p-3 text-sm">
                <li v-for="s in sections" :key="s.id">
                    <a :href="`#${s.id}`" class="block rounded-md px-2 py-1.5 transition duration-300 hover:bg-primary-light hover:text-primary dark:hover:bg-[#1b2e4b]">{{ s.label }}</a>
                </li>
                <li class="!mt-3 px-2 text-[11px] font-bold uppercase tracking-wide text-white-dark">Endpoints</li>
                <li v-for="group in groups" :key="group">
                    <a :href="`#group-${slug(group)}`" class="block rounded-md px-2 py-1.5 transition duration-300 hover:bg-primary-light hover:text-primary dark:hover:bg-[#1b2e4b]">{{ group }}</a>
                </li>
            </ul>
        </aside>

        <div class="min-w-0 max-w-4xl">
            <div class="mb-6">
                <h1 class="text-2xl font-bold dark:text-white-light">API Documentation</h1>
                <p class="mt-1 text-white-dark">The whole API on one page, for reading end to end.</p>
            </div>

            <section id="introduction" class="panel">
                <h2 class="text-lg font-bold dark:text-white-light">Introduction</h2>
                <p class="mt-2 text-white-dark">
                    Orb is a transactional email API. You verify a domain, then send mail from it over HTTPS and
                    receive delivery events by webhook. Everything below is JSON over HTTPS, and every endpoint lives
                    under <span class="font-mono">{{ API_BASE }}</span>.
                </p>
            </section>

            <section id="authentication" class="panel mt-5">
                <h2 class="text-lg font-bold dark:text-white-light">Authentication</h2>
                <pre class="mt-2 whitespace-pre-wrap rounded-md bg-[#fbfbfb] p-4 font-mono text-xs dark:bg-[#1a2941]">{{ AUTH_NOTE }}</pre>
            </section>

            <section id="conventions" class="panel mt-5">
                <h2 class="text-lg font-bold dark:text-white-light">Responses &amp; errors</h2>
                <p class="mt-2 text-white-dark">Successful responses wrap the payload in <span class="font-mono">data</span>. Listed endpoints add <span class="font-mono">meta</span> with paging.</p>
                <OrbCodeBlock class="mt-3" :code="envelopeSample" language="json" title="Envelope" />
                <p class="mt-3 text-white-dark">Failures return the matching HTTP status and a message.</p>
                <OrbCodeBlock class="mt-3" :code="errorSample" language="json" title="Error" badge="400" />
                <div class="mt-4 overflow-hidden rounded-md border border-white-light dark:border-[#1b2e4b]">
                    <table class="w-full table-auto">
                        <thead class="bg-[#fbfbfb] text-xs uppercase dark:bg-[#1a2941]">
                            <tr><th class="px-4 py-2 text-left">Status</th><th class="px-4 py-2 text-left">Meaning</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in statuses" :key="row.code" class="border-t border-white-light dark:border-[#1b2e4b]">
                                <td class="px-4 py-2 font-mono text-sm">{{ row.code }}</td>
                                <td class="px-4 py-2 text-sm text-white-dark">{{ row.meaning }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- Endpoints, grouped -->
            <section v-for="group in groups" :id="`group-${slug(group)}`" :key="group" class="mt-8">
                <h2 class="mb-3 text-lg font-bold dark:text-white-light">{{ group }}</h2>
                <article v-for="e in endpointsByGroup(group, endpoints)" :id="e.id" :key="e.id" class="panel mb-4">
                    <div class="flex flex-wrap items-center gap-2 rounded-md bg-[#fbfbfb] px-3 py-2 dark:bg-[#1a2941]">
                        <OrbMethodBadge :method="e.method" />
                        <code class="min-w-0 flex-1 truncate font-mono text-sm">{{ e.path }}</code>
                        <span v-if="e.managerOnly" class="badge badge-outline-warning shrink-0">Owner/admin</span>
                        <OrbCopyButton :value="API_BASE + e.path" />
                    </div>
                    <h3 class="mt-3 text-base font-bold dark:text-white-light">{{ e.title }}</h3>
                    <p class="mt-1 text-white-dark">{{ e.summary }}</p>
                    <p v-if="e.detail" class="mt-2 text-sm text-white-dark">{{ e.detail }}</p>

                    <div v-if="e.params?.length" class="mt-4">
                        <h4 class="mb-2 text-xs font-bold uppercase tracking-wide text-white-dark">Parameters</h4>
                        <OrbParamTable :params="e.params" title="Parameter" />
                    </div>
                    <div v-if="e.body?.length" class="mt-4">
                        <h4 class="mb-2 text-xs font-bold uppercase tracking-wide text-white-dark">Body</h4>
                        <OrbParamTable :params="e.body" title="Field" />
                    </div>

                    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <OrbCodeBlock :code="curlFor(e)" language="bash" title="Request" />
                        <OrbCodeBlock :code="responseFor(e)" language="json" title="Response" :badge="String(e.responseStatus)" />
                    </div>
                </article>
            </section>

            <section id="webhooks-doc" class="panel mt-8">
                <h2 class="text-lg font-bold dark:text-white-light">Webhooks</h2>
                <pre class="mt-2 whitespace-pre-wrap rounded-md bg-[#fbfbfb] p-4 font-mono text-xs dark:bg-[#1a2941]">{{ WEBHOOK_SIGNATURE_NOTE }}</pre>
                <div class="mt-4 overflow-hidden rounded-md border border-white-light dark:border-[#1b2e4b]">
                    <table class="w-full table-auto">
                        <thead class="bg-[#fbfbfb] text-xs uppercase dark:bg-[#1a2941]">
                            <tr><th class="px-4 py-2 text-left">Event</th><th class="px-4 py-2 text-left">Fires when</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="e in WEBHOOK_EVENTS" :key="e.event" class="border-t border-white-light dark:border-[#1b2e4b]">
                                <td class="px-4 py-2 font-mono text-sm">{{ e.event }}</td>
                                <td class="px-4 py-2 text-sm text-white-dark">{{ e.description }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import type { ApiEndpoint } from '@/utils/apiSpec';
    import { API_BASE, AUTH_NOTE, WEBHOOK_EVENTS, WEBHOOK_SIGNATURE_NOTE, endpointsByGroup, groupsFor, visibleEndpoints } from '@/utils/apiSpec';

    // Same rule as the API Reference: an endpoint a member's key cannot call is
    // not documentation for them, it is a dead end.
    const { user } = useAuth();
    const isManager = computed(() => user.value?.role === 'owner' || user.value?.role === 'admin');
    const endpoints = computed(() => visibleEndpoints(isManager.value));
    const groups = computed(() => groupsFor(endpoints.value));
    import { codeSample } from '@/utils/codeSamples';

    useHead({ title: 'API Documentation' });

    const { apiKey } = useDeveloperKey();

    const sections = [
        { id: 'introduction', label: 'Introduction' },
        { id: 'authentication', label: 'Authentication' },
        { id: 'conventions', label: 'Responses & errors' },
    ];

    const statuses = [
        { code: 200, meaning: 'Success.' },
        { code: 201, meaning: 'Created — the resource now exists.' },
        { code: 400, meaning: 'The request was malformed or a field failed validation.' },
        { code: 401, meaning: 'Missing or invalid API key.' },
        { code: 402, meaning: 'A plan limit was reached.' },
        { code: 403, meaning: 'Authenticated, but not allowed to do this.' },
        { code: 404, meaning: 'No such resource.' },
        { code: 502, meaning: 'Orb could not hand the message to its delivery provider.' },
    ];

    const envelopeSample = JSON.stringify({ data: { id: '…' }, meta: { total: 1, page: 1, per_page: 25 } }, null, 2);
    const errorSample = JSON.stringify({ error: 'from, to, and subject are required' }, null, 2);

    // Long-form reading wants one copyable shape, so this page is curl-only;
    // the Reference page is where you switch languages.
    function curlFor(e: ApiEndpoint) {
        return codeSample(e, 'shell', apiKey.value);
    }
    function responseFor(e: ApiEndpoint) {
        return JSON.stringify(e.response, null, 2);
    }
    function slug(s: string) {
        return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
</script>
