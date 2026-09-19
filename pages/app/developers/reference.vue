<template>
    <div>
        <div class="mb-5">
            <h1 class="text-2xl font-bold dark:text-white-light">API Reference</h1>
            <p class="mt-1 text-white-dark">Every endpoint, with a runnable example in your language.</p>
        </div>

        <div class="grid grid-cols-1 gap-5 2xl:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
            <!-- Index -->
            <aside class="panel !p-0 h-fit xl:sticky xl:top-5">
                <div class="border-b border-white-light px-4 py-3 dark:border-[#1b2e4b]">
                    <h2 class="text-sm font-bold uppercase tracking-wide dark:text-white-light">Endpoints</h2>
                </div>
                <div class="max-h-[70vh] overflow-y-auto p-3">
                    <div v-for="group in groups" :key="group" class="mb-4 last:mb-0">
                        <h3 class="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wide text-white-dark">{{ group }}</h3>
                        <ul class="space-y-0.5">
                            <li v-for="e in endpointsByGroup(group, endpoints)" :key="e.id">
                                <button
                                    type="button"
                                    class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition duration-300"
                                    :class="e.id === selectedId
                                        ? 'bg-primary-light font-semibold text-primary dark:bg-primary dark:text-white'
                                        : 'hover:bg-white-light/70 dark:hover:bg-[#1b2e4b]'"
                                    @click="selectedId = e.id"
                                >
                                    <OrbMethodBadge :method="e.method" />
                                    <span class="truncate">{{ e.title }}</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </aside>

            <!-- Detail -->
            <section v-if="selected" class="panel">
                <div class="mb-4 border-b border-white-light pb-4 dark:border-[#1b2e4b]">
                    <h2 class="text-lg font-bold dark:text-white-light">{{ selected.title }}</h2>
                    <div class="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-[#fbfbfb] px-3 py-2 dark:bg-[#1a2941]">
                        <OrbMethodBadge :method="selected.method" />
                        <code class="min-w-0 flex-1 truncate font-mono text-sm">{{ selected.path }}</code>
                        <span v-if="selected.managerOnly" class="badge badge-outline-warning shrink-0">Owner/admin</span>
                        <OrbCopyButton :value="API_BASE + selected.path" />
                    </div>
                    <p class="mt-3 text-white-dark">{{ selected.summary }}</p>
                    <p v-if="selected.detail" class="mt-2 text-sm text-white-dark">{{ selected.detail }}</p>
                </div>

                <div v-if="selected.params?.length" class="mb-5">
                    <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-white-dark">Parameters</h3>
                    <OrbParamTable :params="selected.params" title="Parameter" />
                </div>

                <div v-if="selected.body?.length" class="mb-5">
                    <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-white-dark">Body</h3>
                    <OrbParamTable :params="selected.body" title="Field" />
                    <p v-if="selected.multipart" class="mt-2 text-xs text-white-dark">
                        Send as JSON, or as <code class="font-mono">multipart/form-data</code> when you need to attach files.
                    </p>
                </div>

                <div class="rounded-md bg-[#fbfbfb] px-4 py-3 dark:bg-[#1a2941]">
                    <h3 class="mb-1.5 text-xs font-bold uppercase tracking-wide text-white-dark">Authentication</h3>
                    <code class="break-all font-mono text-xs">Authorization: Bearer {{ keyPreview }}</code>
                    <p v-if="!apiKey" class="mt-1.5 text-xs text-white-dark">
                        <NuxtLink to="/app/developers/credentials" class="text-primary hover:underline">Add your key</NuxtLink>
                        to fill the samples in with a working one.
                    </p>
                </div>
            </section>

            <!-- Request / response -->
            <section v-if="selected" class="space-y-4 2xl:sticky 2xl:top-5 2xl:h-fit xl:col-span-2 2xl:col-span-1">
                <div class="panel !p-0 overflow-hidden">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white-light px-4 py-3 dark:border-[#1b2e4b]">
                        <h3 class="text-sm font-bold dark:text-white-light">Request</h3>
                        <OrbLanguageTabs v-model="language" />
                    </div>
                    <div class="p-4">
                        <OrbCodeBlock :code="sample" :language="hljsLang" />
                    </div>
                </div>

                <div class="panel !p-0 overflow-hidden">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white-light px-4 py-3 dark:border-[#1b2e4b]">
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm font-bold dark:text-white-light">{{ liveResult ? 'Live response' : 'Example response' }}</h3>
                            <span class="badge" :class="statusClass">{{ statusBadge }}</span>
                        </div>
                        <button v-if="canTry" type="button" class="btn btn-primary btn-sm gap-1.5" :disabled="trying" @click="runIt">
                            <icon-play-circle class="h-4 w-4" />
                            {{ trying ? 'Running…' : 'Try it' }}
                        </button>
                    </div>
                    <div class="p-4">
                        <OrbCodeBlock :code="responseText" language="json" />
                        <p v-if="liveResult" class="mt-2 text-xs text-white-dark">A real call, made as you against {{ API_BASE }}.</p>
                        <p v-else-if="!canTry" class="mt-2 text-xs text-white-dark">
                            Read-only endpoints can be run here. This one changes data and Orb has no sandbox yet, so
                            copy the sample and run it where you can see what it does.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { API_BASE, endpointsByGroup, groupsFor, visibleEndpoints } from '@/utils/apiSpec';
    import { CODE_LANGUAGES, codeSample } from '@/utils/codeSamples';

    useHead({ title: 'API Reference' });

    const { error: toastError } = useToast();

    // Domains and the org-wide usage counters need owner/admin. A member's API
    // key carries the member role, so listing those here would only hand them
    // samples that answer 403 - and "Try it" runs as the caller, so it would
    // fail too. Hide them rather than document a lie.
    const { user } = useAuth();
    const isManager = computed(() => user.value?.role === 'owner' || user.value?.role === 'admin');
    const endpoints = computed(() => visibleEndpoints(isManager.value));
    const groups = computed(() => groupsFor(endpoints.value));

    const selectedId = ref(endpoints.value[0].id);
    // Also the guard against deep-linking to a hidden endpoint.
    const selected = computed(() => endpoints.value.find((e) => e.id === selectedId.value));
    const language = ref('shell');
    const hljsLang = computed(() => CODE_LANGUAGES.find((l) => l.id === language.value)?.hljs ?? 'bash');

    const { apiKey, keyPreview } = useDeveloperKey();
    const sample = computed(() => (selected.value ? codeSample(selected.value, language.value, apiKey.value) : ''));

    const trying = ref(false);
    const liveResult = ref<{ status: number; body: unknown } | null>(null);
    watch(selectedId, () => (liveResult.value = null));

    // Mirrors the allow-list in server/api/developers/try.post.ts. Endpoints with
    // a {placeholder} need a real id, and writes would have real effects - POST
    // /api/emails would put a message on the wire on every click.
    const canTry = computed(
        () => !!selected.value && selected.value.method === 'GET' && !selected.value.path.includes('{'),
    );

    const responseText = computed(() =>
        JSON.stringify(liveResult.value ? liveResult.value.body : selected.value?.response, null, 2),
    );
    const statusBadge = computed(() =>
        String(liveResult.value ? liveResult.value.status : (selected.value?.responseStatus ?? '')),
    );
    const statusClass = computed(() => {
        const s = Number(statusBadge.value);
        if (!s) return 'bg-white-light text-white-dark';
        return s < 300 ? 'bg-success/20 text-success' : s < 500 ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger';
    });

    async function runIt() {
        if (!selected.value || trying.value) return;
        trying.value = true;
        try {
            const res = await $fetch<{ status: number; body: unknown }>('/api/developers/try', {
                method: 'POST',
                body: { method: selected.value.method, path: selected.value.path, body: selected.value.example ?? null },
            });
            liveResult.value = res;
        } catch (e: any) {
            toastError(e?.data?.message || 'Request failed');
        } finally {
            trying.value = false;
        }
    }
</script>
