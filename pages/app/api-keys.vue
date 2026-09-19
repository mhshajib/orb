<script lang="ts" setup>
import type { ApiKey, CreateApiKeyResponse } from '@/composables/useApiKeys'

useHead({ title: 'API Keys' })

const { success, error: toastError } = useToast()
const { user } = useAuth()
// API keys are per-user: every member manages their own (you only ever see/revoke your own).
const canManage = computed(() => !!user.value)

const { data: keys, pending, error, refresh } = await useAsyncData('app-api-keys', () => listApiKeys())

type DialogStage = 'closed' | 'form' | 'secret'
const stage = ref<DialogStage>('closed')
const formName = ref('')
const submitting = ref(false)
const submitError = ref('')
const created = ref<CreateApiKeyResponse | null>(null)

function openCreate() {
  if (!canManage.value) return
  formName.value = ''
  submitError.value = ''
  created.value = null
  stage.value = 'form'
}

function closeDialog() {
  stage.value = 'closed'
  created.value = null
}

async function onCreate() {
  if (submitting.value) return
  submitError.value = ''
  if (!formName.value.trim()) {
    submitError.value = 'Name is required.'
    return
  }
  submitting.value = true
  try {
    const res = await createApiKey(formName.value.trim())
    created.value = res
    stage.value = 'secret'
    await refresh()
  }
  catch (e) {
    submitError.value = errMsg(e, 'Could not create key')
  }
  finally {
    submitting.value = false
  }
}

// Revoke flow — uses the shared confirm() dialog before the destructive call.
async function askRevoke(k: ApiKey) {
  if (!canManage.value) return
  const ok = await useToast().confirm({
    title: 'Revoke this API key?',
    text: `${k.name} (${k.key_preview}…) will stop working immediately. Any service still using it will get 401s.`,
    confirmText: 'Revoke key',
    danger: true,
  })
  if (!ok) return
  try {
    await revokeApiKey(k.id)
    success('API key revoked.')
    await refresh()
  }
  catch (e) {
    toastError(errMsg(e, 'Could not revoke key'))
  }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
function fmtLastUsed(s: string | null) {
  if (!s) return 'Never'
  return new Date(s).toLocaleString()
}
</script>

<template>
    <div>
        <!-- Breadcrumb -->
        <ul class="flex space-x-2 rtl:space-x-reverse">
            <li>
                <NuxtLink to="/app" class="text-primary hover:underline">Home</NuxtLink>
            </li>
            <li class="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                <span>API Keys</span>
            </li>
        </ul>

        <div class="pt-5">
            <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 class="text-2xl font-semibold dark:text-white-light">API Keys</h2>
                    <p class="mt-1 max-w-2xl text-white-dark">
                        Your personal API credentials for the Orb REST API. Keys bypass 2FA — guard them like passwords.
                    </p>
                </div>
                <button type="button" class="btn btn-primary gap-2" :disabled="!canManage" @click="openCreate">
                    <icon-plus class="h-4 w-4" /> New key
                </button>
            </div>

            <!-- Load error -->
            <div v-if="error" class="mb-5 rounded border border-danger/50 bg-danger-light p-4 text-danger dark:bg-danger/10">
                {{ errMsg(error, 'Could not load API keys') }}
            </div>

            <!-- Loading -->
            <div v-if="pending && !keys" class="panel">
                <div class="space-y-3">
                    <div class="h-5 w-48 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                    <div class="h-5 w-64 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                    <div class="h-5 w-40 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="!keys?.length" class="panel">
                <div class="flex flex-col items-center gap-4 py-14 text-center">
                    <div class="grid h-16 w-16 place-content-center rounded-2xl bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                        <icon-lock-dots class="h-7 w-7" />
                    </div>
                    <div>
                        <div class="text-lg font-semibold dark:text-white-light">No API keys yet</div>
                        <div class="text-sm text-white-dark">Create one to start sending mail programmatically.</div>
                    </div>
                    <button type="button" class="btn btn-primary gap-2" :disabled="!canManage" @click="openCreate">
                        <icon-plus class="h-4 w-4" /> Create your first key
                    </button>
                </div>
            </div>

            <!-- Table -->
            <div v-else class="panel p-0">
                <div class="mb-5 flex items-center justify-between border-b border-white-light px-5 pt-5 pb-4 dark:border-[#1b2e4b]">
                    <h5 class="text-lg font-semibold dark:text-white-light">Active keys</h5>
                    <span class="badge bg-primary/20 text-primary dark:bg-primary dark:text-white">{{ keys.length }} total</span>
                </div>
                <div class="table-responsive">
                    <table class="table-hover whitespace-nowrap">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Key</th>
                                <th>Last used</th>
                                <th>Created</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="k in keys" :key="k.id">
                                <td>
                                    <div class="flex items-center gap-3">
                                        <div class="grid h-9 w-9 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
                                            <icon-lock-dots class="h-4.5 w-4.5" />
                                        </div>
                                        <span class="font-semibold text-dark dark:text-white-light">{{ k.name }}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="rounded bg-[#f1f2f3] px-2 py-1 font-mono text-xs text-white-dark dark:bg-[#1b2e4b]">{{ k.key_preview }}…</span>
                                </td>
                                <td class="text-xs text-white-dark">{{ fmtLastUsed(k.last_used_at) }}</td>
                                <td class="text-xs text-white-dark">{{ fmtDate(k.created_at) }}</td>
                                <td class="text-center">
                                    <client-only>
                                        <button
                                            type="button"
                                            v-tippy:revoke
                                            class="text-danger enabled:hover:text-danger/70 disabled:opacity-40"
                                            :disabled="!canManage"
                                            :aria-label="`Revoke ${k.name}`"
                                            @click="askRevoke(k)"
                                        >
                                            <icon-trash class="m-auto h-5 w-5" />
                                        </button>
                                        <tippy target="revoke">Revoke key</tippy>
                                    </client-only>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Create / reveal dialog -->
        <div v-if="stage !== 'closed'" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
            <!-- Form -->
            <div v-if="stage === 'form'" class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
                <div class="flex items-center justify-between bg-[#fbfbfb] py-3 px-5 dark:bg-[#121c2c]">
                    <h5 class="text-lg font-bold dark:text-white-light">Create an API key</h5>
                    <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="closeDialog">
                        <icon-x class="h-5 w-5" />
                    </button>
                </div>
                <p class="px-5 pt-5 text-sm text-white-dark">
                    Pick a name you'll recognize later (the service or environment that'll use the key).
                </p>
                <form class="space-y-4 p-5" @submit.prevent="onCreate">
                    <div>
                        <label for="key-name" class="mb-1.5 block font-semibold">Name</label>
                        <input id="key-name" v-model="formName" type="text" class="form-input" placeholder="GitHub Actions deploy bot" required />
                    </div>
                    <div v-if="submitError" class="rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
                        {{ submitError }}
                    </div>
                    <div class="flex justify-end gap-2">
                        <button type="button" class="btn btn-outline-primary" @click="closeDialog">Cancel</button>
                        <button type="submit" class="btn btn-primary" :disabled="submitting">
                            {{ submitting ? 'Creating…' : 'Create key' }}
                        </button>
                    </div>
                </form>
            </div>

            <!-- Reveal secret (shown ONCE) -->
            <div v-else-if="stage === 'secret' && created" class="panel w-full max-w-lg overflow-hidden rounded-lg border-0 p-0">
                <div class="flex items-center justify-between bg-success-light py-3 px-5 dark:bg-success/10">
                    <h5 class="flex items-center gap-2 text-lg font-bold text-success">
                        <icon-circle-check class="h-5 w-5" /> Save your API key
                    </h5>
                    <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="closeDialog">
                        <icon-x class="h-5 w-5" />
                    </button>
                </div>
                <div class="p-5">
                    <p class="mb-4 text-sm text-white-dark">
                        This is the only time we'll show you the plaintext key. Store it somewhere secret — there's no way to retrieve it later.
                    </p>

                    <div class="mb-4 flex items-start gap-2 rounded border border-warning/50 bg-warning-light p-3 text-sm text-warning-dark dark:bg-warning/10">
                        <icon-info-circle class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <span class="dark:text-warning">
                            Use as <code class="font-mono text-xs">Authorization: Bearer {{ created.metadata.key_preview }}…</code>
                            on any <code class="font-mono text-xs">/api/*</code> request.
                        </span>
                    </div>

                    <div class="flex items-center gap-2 rounded border border-success/50 bg-success-light p-3 dark:bg-success/10">
                        <span class="flex-1 break-all font-mono text-sm">{{ created.key }}</span>
                        <OrbCopyButton :value="created.key" />
                    </div>

                    <div class="mt-6 flex justify-end">
                        <button type="button" class="btn btn-primary" @click="closeDialog">Done</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
