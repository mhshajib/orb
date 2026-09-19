<template>
    <div>
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 class="text-2xl font-bold dark:text-white-light">API Credentials</h1>
                <p class="mt-1 text-white-dark">What you need to authenticate, and where to manage it.</p>
            </div>
            <NuxtLink to="/app/api-keys" class="btn btn-primary gap-2">
                <icon-plus class="h-4 w-4" /> Manage API keys
            </NuxtLink>
        </div>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div class="panel lg:col-span-2">
                <div class="mb-5 flex items-center gap-3 border-b border-white-light pb-4 dark:border-[#1b2e4b]">
                    <div class="grid h-10 w-10 place-content-center rounded-xl bg-danger-light text-danger dark:bg-danger dark:text-white">
                        <icon-lock class="h-5 w-5" />
                    </div>
                    <div>
                        <h2 class="text-base font-bold dark:text-white-light">Production</h2>
                        <p class="text-xs text-white-dark">Credentials for the live environment</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <div v-for="row in rows" :key="row.label" class="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[#fbfbfb] px-4 py-3 dark:bg-[#1a2941]">
                        <span class="text-sm font-semibold">{{ row.label }}</span>
                        <div class="flex min-w-0 items-center gap-2">
                            <code class="truncate font-mono text-xs">{{ row.value }}</code>
                            <OrbCopyButton v-if="row.copy" :value="row.copy" />
                        </div>
                    </div>
                </div>

                <div class="mt-5 flex items-start gap-3 rounded-md border border-warning/40 bg-warning-light p-4 dark:bg-warning/10">
                    <icon-info-circle class="h-5 w-5 shrink-0 text-warning" />
                    <p class="text-sm text-dark dark:text-white-light">
                        Orb stores only a hash of each key, so a key is shown exactly once — at creation. Lose it and
                        you revoke it and make a new one; there is no way to recover it.
                    </p>
                </div>
            </div>

            <div class="panel">
                <h2 class="mb-1 text-base font-bold dark:text-white-light">Personalise the examples</h2>
                <p class="text-white-dark">
                    Paste a key and every sample in these docs renders with it, ready to copy and run.
                </p>
                <div class="mt-4 space-y-3">
                    <input v-model="draft" type="password" class="form-input font-mono" placeholder="orb_live_…" autocomplete="off" />
                    <div class="flex flex-wrap gap-2">
                        <button type="button" class="btn btn-primary btn-sm flex-1" @click="save">Use in examples</button>
                        <button v-if="apiKey" type="button" class="btn btn-outline-danger btn-sm" @click="forget">Forget</button>
                    </div>
                </div>
                <div v-if="apiKey" class="mt-3 flex items-center gap-2 rounded-md bg-success-light px-3 py-2 text-xs text-success dark:bg-success/10">
                    <icon-circle-check class="h-4 w-4 shrink-0" />
                    Samples are using your key
                </div>
                <p class="mt-3 text-xs text-white-dark">
                    Held in this browser tab only. Never sent to Orb, and gone when the tab closes.
                </p>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { API_BASE } from '@/utils/apiSpec';

    useHead({ title: 'API Credentials' });

    const { apiKey, setKey, clearKey } = useDeveloperKey();
    const { success } = useToast();
    const draft = ref('');

    const rows = [
        { label: 'Base URL', value: API_BASE, copy: API_BASE },
        { label: 'Auth header', value: 'Authorization: Bearer <key>', copy: 'Authorization: Bearer ' },
        { label: 'Key prefix', value: 'orb_live_', copy: '' },
        { label: 'Content type', value: 'application/json', copy: 'application/json' },
    ];

    function save() {
        setKey(draft.value);
        draft.value = '';
        if (apiKey.value) success('Examples will use your key');
    }
    function forget() {
        clearKey();
        success('Key forgotten');
    }
</script>
