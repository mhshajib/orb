<template>
    <div class="mx-auto max-w-4xl">
        <div class="mb-6">
            <h1 class="text-2xl font-bold dark:text-white-light">API Credentials</h1>
            <p class="mt-1 text-white-dark">What you need to authenticate, and where to manage it.</p>
        </div>

        <div class="panel">
            <h2 class="text-base font-bold dark:text-white-light">Production</h2>
            <p class="text-white-dark">Credentials for the live environment.</p>
            <dl class="mt-4 divide-y divide-white-light dark:divide-[#1b2e4b]">
                <div class="flex flex-wrap items-center justify-between gap-3 py-3">
                    <dt class="font-semibold">Base URL</dt>
                    <dd class="flex items-center gap-2">
                        <code class="font-mono text-sm">{{ API_BASE }}</code>
                        <OrbCopyButton :value="API_BASE" />
                    </dd>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-3 py-3">
                    <dt class="font-semibold">Auth header</dt>
                    <dd class="flex items-center gap-2">
                        <code class="font-mono text-sm">Authorization: Bearer &lt;key&gt;</code>
                        <OrbCopyButton value="Authorization: Bearer " />
                    </dd>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-3 py-3">
                    <dt class="font-semibold">Key prefix</dt>
                    <dd><code class="font-mono text-sm">orb_live_</code></dd>
                </div>
            </dl>
        </div>

        <div class="panel mt-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 class="text-base font-bold dark:text-white-light">Your keys</h2>
                    <p class="text-white-dark">Keys belong to you, not the whole organisation. Create and revoke them here.</p>
                </div>
                <NuxtLink to="/app/api-keys" class="btn btn-primary btn-sm">Manage API keys</NuxtLink>
            </div>
            <div class="mt-4 flex items-start gap-3 rounded-md border border-warning/40 bg-warning-light p-4 text-sm dark:bg-warning/10">
                <icon-info-circle class="h-5 w-5 shrink-0 text-warning" />
                <p class="text-dark dark:text-white-light">
                    Orb stores only a hash of each key, so a key can be shown exactly once — at creation.
                    If you lose it, revoke it and make a new one; there is no way to recover it.
                </p>
            </div>
        </div>

        <div class="panel mt-5">
            <h2 class="text-base font-bold dark:text-white-light">Personalise the examples</h2>
            <p class="text-white-dark">
                Paste a key to have every sample in the docs render with it, ready to copy and run.
                It is kept in this browser tab only, is never sent to Orb, and disappears when the tab closes.
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
                <input
                    v-model="draft"
                    type="password"
                    class="form-input max-w-md font-mono"
                    placeholder="orb_live_…"
                    autocomplete="off"
                />
                <button type="button" class="btn btn-primary btn-sm" @click="save">Use in examples</button>
                <button v-if="apiKey" type="button" class="btn btn-outline-danger btn-sm" @click="forget">Forget</button>
            </div>
            <p v-if="apiKey" class="mt-2 text-xs text-success">Samples are using your key.</p>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { API_BASE } from '@/utils/apiSpec';

    definePageMeta({ layout: 'developers' });
    useHead({ title: 'API Credentials' });

    const { apiKey, setKey, clearKey } = useDeveloperKey();
    const { success } = useToast();
    const draft = ref('');

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
