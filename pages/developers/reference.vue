<template>
    <div>
        <div class="mb-5">
            <h1 class="text-2xl font-bold dark:text-white-light">API Reference</h1>
            <p class="mt-1 text-white-dark">Every endpoint, with a runnable example in your language.</p>
        </div>

        <div class="grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
            <!-- Endpoint index -->
            <aside class="panel h-fit xl:sticky xl:top-5">
                <div v-for="group in API_GROUPS" :key="group" class="mb-4 last:mb-0">
                    <h3 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-white-dark">{{ group }}</h3>
                    <ul class="space-y-0.5">
                        <li v-for="e in endpointsByGroup(group)" :key="e.id">
                            <button
                                type="button"
                                class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition"
                                :class="e.id === selectedId ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-white-light/60 dark:hover:bg-[#1b2e4b]'"
                                @click="selectedId = e.id"
                            >
                                <OrbMethodBadge :method="e.method" />
                                <span class="truncate">{{ e.title }}</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </aside>

            <!-- Endpoint detail -->
            <section v-if="selected" class="panel">
                <h2 class="text-lg font-bold dark:text-white-light">{{ selected.title }}</h2>
                <div class="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-[#fbfbfb] px-3 py-2 dark:bg-[#1a2941]">
                    <OrbMethodBadge :method="selected.method" />
                    <code class="font-mono text-sm">{{ selected.path }}</code>
                </div>
                <p class="mt-3 text-white-dark">{{ selected.summary }}</p>
                <p v-if="selected.detail" class="mt-2 text-sm text-white-dark">{{ selected.detail }}</p>

                <div class="mt-5">
                    <h3 class="mb-2 text-sm font-bold uppercase tracking-wide">Authentication</h3>
                    <div class="rounded-md border border-white-light px-3 py-2 font-mono text-xs dark:border-[#1b2e4b]">
                        Authorization: Bearer {{ keyPreview }}
                    </div>
                    <p v-if="!apiKey" class="mt-1.5 text-xs text-white-dark">
                        <NuxtLink to="/developers/credentials" class="text-primary hover:underline">Create a key</NuxtLink>
                        to have the samples filled in with a working one.
                    </p>
                </div>

                <div v-if="selected.params?.length" class="mt-5">
                    <h3 class="mb-2 text-sm font-bold uppercase tracking-wide">Parameters</h3>
                    <OrbParamTable :params="selected.params" title="Parameter" />
                </div>

                <div v-if="selected.body?.length" class="mt-5">
                    <h3 class="mb-2 text-sm font-bold uppercase tracking-wide">Body</h3>
                    <OrbParamTable :params="selected.body" title="Field" />
                    <p v-if="selected.multipart" class="mt-2 text-xs text-white-dark">
                        Send as JSON, or as <span class="font-mono">multipart/form-data</span> when you need to attach files.
                    </p>
                </div>
            </section>

            <!-- Request + response -->
            <section v-if="selected" class="space-y-4 xl:sticky xl:top-5 xl:h-fit">
                <div>
                    <div class="mb-2 flex items-center justify-between gap-2">
                        <span class="text-[11px] font-bold uppercase tracking-wide text-white-dark">Language</span>
                        <OrbLanguageTabs v-model="language" />
                    </div>
                    <OrbCodeBlock :code="sample" :language="hljsLang" title="Request" />
                </div>

                <div>
                    <div class="mb-2 flex items-center justify-between gap-2">
                        <span class="text-[11px] font-bold uppercase tracking-wide text-white-dark">Response</span>
                        <button
                            v-if="canTry"
                            type="button"
                            class="btn btn-primary btn-sm gap-1"
                            :disabled="trying"
                            @click="runIt"
                        >
                            <icon-play-circle class="h-4 w-4" />
                            {{ trying ? 'Running…' : 'Try it' }}
                        </button>
                    </div>
                    <OrbCodeBlock
                        :code="responseText"
                        language="json"
                        :title="liveResult ? 'Live response' : 'Example response'"
                        :badge="statusBadge"
                    />
                    <p v-if="liveResult" class="mt-1.5 text-xs text-white-dark">
                        A real call, made as you against {{ API_BASE }}.
                    </p>
                    <p v-else-if="!canTry" class="mt-1.5 text-xs text-white-dark">
                        Read-only endpoints can be run from here. This one changes data and Orb has no
                        sandbox yet, so copy the sample and run it where you can see what it does.
                    </p>
                </div>
            </section>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { API_BASE, API_GROUPS, API_ENDPOINTS, endpointsByGroup, findEndpoint } from '@/utils/apiSpec';
    import { CODE_LANGUAGES, codeSample } from '@/utils/codeSamples';

    definePageMeta({ layout: 'developers' });
    useHead({ title: 'API Reference' });

    const { error: toastError } = useToast();

    const selectedId = ref(API_ENDPOINTS[0].id);
    const selected = computed(() => findEndpoint(selectedId.value));
    const language = ref('shell');
    const hljsLang = computed(() => CODE_LANGUAGES.find((l) => l.id === language.value)?.hljs ?? 'bash');

    // A key the samples can be pasted straight out of. Only the signed-in user's
    // own keys are ever fetched, and only a full key they have chosen to reveal.
    const { apiKey, keyPreview } = useDeveloperKey();

    // Mirrors the allow-list in server/api/developers/try.post.ts. Endpoints
    // with a {placeholder} need a real id, and writes would have real effects -
    // POST /api/emails would put a message on the wire on every click.
    const canTry = computed(
        () => !!selected.value && selected.value.method === 'GET' && !selected.value.path.includes('{'),
    );

    const sample = computed(() => (selected.value ? codeSample(selected.value, language.value, apiKey.value) : ''));

    // ── Try it ────────────────────────────────────────────────────────────
    const trying = ref(false);
    const liveResult = ref<{ status: number; body: unknown } | null>(null);

    // Switching endpoints must drop the previous result, or the response panel
    // shows one endpoint's output under another's heading.
    watch(selectedId, () => (liveResult.value = null));

    const responseText = computed(() => {
        const body = liveResult.value ? liveResult.value.body : selected.value?.response;
        return JSON.stringify(body, null, 2);
    });

    const statusBadge = computed(() => {
        const status = liveResult.value ? liveResult.value.status : selected.value?.responseStatus;
        return status ? String(status) : '';
    });

    async function runIt() {
        if (!selected.value || trying.value) return;
        trying.value = true;
        try {
            // Routed through our own server so the key is attached server-side
            // and never leaves the browser in a cross-origin request.
            const res = await $fetch<{ status: number; body: unknown }>('/api/developers/try', {
                method: 'POST',
                body: {
                    method: selected.value.method,
                    path: selected.value.path,
                    body: selected.value.example ?? null,
                },
            });
            liveResult.value = res;
        } catch (e: any) {
            toastError(e?.data?.message || 'Request failed');
        } finally {
            trying.value = false;
        }
    }
</script>
