<script lang="ts" setup>
import type { WebhookDelivery, WebhookEvent } from '@/composables/useWebhooks'

const { success: toastSuccess, error: toastError, confirm } = useToast()

const route = useRoute()
const id = computed(() => String(route.params.id))

const { data: webhook, pending, error, refresh } = await useAsyncData(
  'app-webhook',
  () => getWebhook(id.value),
  { watch: [id] },
)

useHead({ title: () => (webhook.value ? `${webhook.value.name} — Webhook` : 'Webhook') })

const tab = ref<'settings' | 'deliveries'>('settings')

// Settings form local state (clones the webhook so edits aren't committed until Save)
const formName = ref('')
const formUrl = ref('')
const formActive = ref(true)
const formEvents = ref<WebhookEvent[]>([])

function resetForm() {
  if (!webhook.value) return
  formName.value = webhook.value.name
  formUrl.value = webhook.value.url
  formActive.value = webhook.value.active
  formEvents.value = [...webhook.value.events]
}
watchEffect(() => { if (webhook.value) resetForm() })

const dirty = computed(() => {
  if (!webhook.value) return false
  const w = webhook.value
  if (w.name !== formName.value) return true
  if (w.url !== formUrl.value) return true
  if (w.active !== formActive.value) return true
  if (w.events.length !== formEvents.value.length) return true
  return w.events.some(e => !formEvents.value.includes(e))
})

function toggleEvent(e: WebhookEvent) {
  const i = formEvents.value.indexOf(e)
  if (i >= 0) formEvents.value.splice(i, 1)
  else formEvents.value.push(e)
}

const saving = ref(false)

async function onSave() {
  if (saving.value || !dirty.value) return
  saving.value = true
  try {
    await updateWebhook(id.value, {
      name: formName.value.trim(),
      url: formUrl.value.trim(),
      active: formActive.value,
      events: formEvents.value,
    })
    await refresh()
    toastSuccess('Webhook saved.')
  }
  catch (e) {
    toastError(errMsg(e, 'Save failed'))
  }
  finally {
    saving.value = false
  }
}

// Test
const testing = ref(false)
async function onTest() {
  if (testing.value) return
  testing.value = true
  try {
    const delivery = await testWebhook(id.value)
    toastSuccess(`Test queued — delivery #${delivery.attempt}.`)
    if (tab.value === 'deliveries') await refreshDeliveries()
  }
  catch (e) {
    toastError(errMsg(e, 'Test failed'))
  }
  finally {
    testing.value = false
  }
}

// Rotate
const rotateOpen = ref(false)
const rotating = ref(false)
const newSecret = ref('')
async function onRotate() {
  if (rotating.value) return
  rotating.value = true
  try {
    const updated = await rotateWebhookSecret(id.value)
    newSecret.value = updated.secret ?? ''
  }
  catch (e) {
    toastError(errMsg(e, 'Rotation failed'))
    rotateOpen.value = false
  }
  finally {
    rotating.value = false
  }
}
function openRotate() {
  newSecret.value = ''
  rotateOpen.value = true
}
function closeRotate() {
  rotateOpen.value = false
  newSecret.value = ''
}

// Delete
const deleting = ref(false)
async function onDelete() {
  if (deleting.value || !webhook.value) return
  const ok = await confirm({
    title: 'Delete this webhook?',
    text: `${webhook.value.name} will stop receiving events. This cannot be undone.`,
    confirmText: 'Delete webhook',
    danger: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await deleteWebhook(id.value)
    toastSuccess('Webhook deleted.')
    await navigateTo('/app/webhooks')
  }
  catch (e) {
    toastError(errMsg(e, 'Delete failed'))
    deleting.value = false
  }
}

// Deliveries tab
const deliveriesPage = ref(1)
const perPage = 20
const { data: deliveries, pending: dPending, refresh: refreshDeliveries } = await useAsyncData(
  'app-deliveries',
  () => listWebhookDeliveries(id.value, { limit: perPage, offset: (deliveriesPage.value - 1) * perPage }),
  { watch: [deliveriesPage, id] },
)

const expanded = ref<string | null>(null)
function toggleExpand(d: WebhookDelivery) {
  expanded.value = expanded.value === d.id ? null : d.id
}

function fmtTime(s: string | null | undefined) {
  return s ? new Date(s).toLocaleString() : '—'
}
function fmtJson(s: string) {
  try { return JSON.stringify(JSON.parse(s), null, 2) }
  catch { return s }
}
function deliveryStatus(d: WebhookDelivery) {
  if (d.success) return { label: 'Success', cls: 'badge bg-success' }
  if (d.next_retry_at) return { label: 'Pending retry', cls: 'badge bg-warning' }
  return { label: 'Failed', cls: 'badge bg-danger' }
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
                <NuxtLink to="/app/webhooks" class="text-primary hover:underline">Webhooks</NuxtLink>
            </li>
            <li class="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                <span>{{ webhook?.name || 'Detail' }}</span>
            </li>
        </ul>

        <div class="pt-5">
            <!-- Load error -->
            <div v-if="error" class="mb-5 rounded border border-danger/50 bg-danger-light p-4 text-danger dark:bg-danger/10">
                {{ errMsg(error, 'Could not load webhook') }}
            </div>

            <!-- Loading -->
            <div v-if="pending && !webhook" class="panel">
                <div class="space-y-3">
                    <div class="h-7 w-64 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                    <div class="h-32 w-full animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                </div>
            </div>

            <template v-else-if="webhook">
                <!-- Header panel -->
                <div class="panel mb-5">
                    <div class="flex items-center gap-4">
                        <div class="grid h-14 w-14 shrink-0 place-content-center rounded-xl bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                            <icon-link class="h-7 w-7" />
                        </div>
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-3">
                                <h2 class="text-2xl font-semibold dark:text-white-light">{{ webhook.name }}</h2>
                                <span class="badge" :class="webhook.active ? 'bg-success' : 'bg-warning'">{{ webhook.active ? 'Active' : 'Paused' }}</span>
                            </div>
                            <p class="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-white-dark">
                                <icon-link class="h-4 w-4 shrink-0" />
                                <span class="truncate font-mono">{{ webhook.url }}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="mb-5 flex flex-wrap border-b border-white-light dark:border-[#191e3a]">
                    <a
                        href="javascript:;"
                        class="-mb-[1px] block border border-transparent p-3.5 py-2 !outline-none transition duration-300 hover:text-primary dark:hover:border-b-black"
                        :class="{ '!border-white-light !border-b-white text-primary dark:!border-[#191e3a] dark:!border-b-black': tab === 'settings' }"
                        @click="tab = 'settings'"
                    >
                        <span class="flex items-center gap-2"><icon-settings class="h-4.5 w-4.5" /> Settings</span>
                    </a>
                    <a
                        href="javascript:;"
                        class="-mb-[1px] block border border-transparent p-3.5 py-2 !outline-none transition duration-300 hover:text-primary dark:hover:border-b-black"
                        :class="{ '!border-white-light !border-b-white text-primary dark:!border-[#191e3a] dark:!border-b-black': tab === 'deliveries' }"
                        @click="tab = 'deliveries'"
                    >
                        <span class="flex items-center gap-2"><icon-list-check class="h-4.5 w-4.5" /> Deliveries</span>
                    </a>
                </div>

                <!-- Settings tab -->
                <div v-if="tab === 'settings'" class="space-y-5">
                    <!-- Configuration -->
                    <div class="panel">
                        <h5 class="mb-4 flex items-center gap-2 text-lg font-semibold dark:text-white-light">
                            <icon-settings class="h-5 w-5 text-primary" /> Configuration
                        </h5>
                        <div class="space-y-4">
                            <div>
                                <label for="name" class="mb-1.5 block font-semibold">Name</label>
                                <input id="name" v-model="formName" type="text" class="form-input" />
                            </div>
                            <div>
                                <label for="url" class="mb-1.5 block font-semibold">URL</label>
                                <input id="url" v-model="formUrl" type="url" class="form-input" />
                            </div>
                            <div class="flex items-center justify-between gap-4">
                                <div>
                                    <div class="font-semibold">Active</div>
                                    <p class="text-xs text-white-dark">When paused, Orb stops delivering events.</p>
                                </div>
                                <label class="relative inline-flex cursor-pointer items-center">
                                    <input v-model="formActive" type="checkbox" class="form-checkbox" />
                                    <span class="ml-2 text-sm">{{ formActive ? 'Active' : 'Paused' }}</span>
                                </label>
                            </div>
                            <div>
                                <label class="mb-1.5 block font-semibold">Events</label>
                                <div class="grid grid-cols-1 gap-2 rounded border border-white-light p-3 sm:grid-cols-2 dark:border-[#1b2e4b]">
                                    <label v-for="ev in ALL_WEBHOOK_EVENTS" :key="ev" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition hover:bg-primary/10">
                                        <input
                                            type="checkbox"
                                            class="form-checkbox"
                                            :checked="formEvents.includes(ev)"
                                            @change="toggleEvent(ev)"
                                        />
                                        <span class="font-mono text-xs">{{ ev }}</span>
                                    </label>
                                </div>
                            </div>
                            <div class="flex justify-end gap-2">
                                <button type="button" class="btn btn-outline-primary" :disabled="!dirty" @click="resetForm">Reset</button>
                                <button type="button" class="btn btn-primary" :disabled="!dirty || saving" @click="onSave">
                                    {{ saving ? 'Saving…' : 'Save changes' }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="panel">
                        <h5 class="mb-4 flex items-center gap-2 text-lg font-semibold dark:text-white-light">
                            <icon-bolt class="h-5 w-5 text-primary" /> Actions
                        </h5>
                        <div class="space-y-4">
                            <div class="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <div class="font-semibold">Send test delivery</div>
                                    <div class="text-xs text-white-dark">Fires a synthetic <code class="font-mono">email.delivered</code> event.</div>
                                </div>
                                <button type="button" class="btn btn-outline-primary btn-sm gap-2" :disabled="testing" @click="onTest">
                                    <icon-send class="h-4 w-4" /> {{ testing ? 'Sending…' : 'Send test' }}
                                </button>
                            </div>
                            <div class="flex flex-wrap items-center justify-between gap-4 border-t border-white-light pt-4 dark:border-dark">
                                <div>
                                    <div class="font-semibold">Rotate signing secret</div>
                                    <div class="text-xs text-white-dark">Old secret stops working immediately. Coordinate with your consumer.</div>
                                </div>
                                <button type="button" class="btn btn-outline-warning btn-sm gap-2" @click="openRotate">
                                    <icon-refresh class="h-4 w-4" /> Rotate
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Danger zone -->
                    <div class="panel border border-danger/40">
                        <h5 class="mb-4 text-lg font-semibold text-danger">Danger zone</h5>
                        <div class="flex flex-wrap items-center justify-between gap-4">
                            <div class="text-sm text-white-dark">Deleting the webhook stops all event deliveries and discards its delivery history.</div>
                            <button type="button" class="btn btn-danger btn-sm gap-2" :disabled="deleting" @click="onDelete">
                                <icon-trash class="h-4 w-4" /> {{ deleting ? 'Deleting…' : 'Delete webhook' }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Deliveries tab -->
                <div v-else class="space-y-4">
                    <div class="panel p-0">
                        <div v-if="dPending && !deliveries" class="p-6">
                            <div class="h-32 w-full animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                        </div>
                        <div v-else-if="!deliveries?.items?.length" class="p-12 text-center text-sm text-white-dark">
                            No deliveries yet. Try
                            <button type="button" class="text-primary underline-offset-4 hover:underline" @click="onTest">sending a test</button>.
                        </div>
                        <div v-else>
                            <div class="flex items-center justify-between border-b border-white-light px-5 py-4 dark:border-[#1b2e4b]">
                                <h5 class="flex items-center gap-2 text-lg font-semibold dark:text-white-light">
                                    <icon-list-check class="h-5 w-5 text-primary" /> Recent deliveries
                                </h5>
                                <button type="button" class="btn btn-outline-primary btn-sm gap-2" :disabled="testing" @click="onTest">
                                    <icon-send class="h-4 w-4" /> {{ testing ? 'Sending…' : 'Send test' }}
                                </button>
                            </div>
                            <div class="table-responsive">
                            <table class="table-hover whitespace-nowrap">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Event</th>
                                        <th class="text-right">HTTP</th>
                                        <th class="text-right">Attempt</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template v-for="d in deliveries.items" :key="d.id">
                                        <tr class="cursor-pointer" @click="toggleExpand(d)">
                                            <td class="text-xs tabular-nums text-white-dark">{{ fmtTime(d.delivered_at || d.created_at) }}</td>
                                            <td class="font-mono text-xs">{{ d.event }}</td>
                                            <td class="text-right font-mono tabular-nums">{{ d.status_code || '—' }}</td>
                                            <td class="text-right tabular-nums">{{ d.attempt }}</td>
                                            <td><span :class="deliveryStatus(d).cls">{{ deliveryStatus(d).label }}</span></td>
                                            <td class="text-right">
                                                <icon-caret-down class="h-4 w-4 transition-transform" :class="expanded === d.id ? 'rotate-180' : ''" />
                                            </td>
                                        </tr>
                                        <tr v-if="expanded === d.id">
                                            <td colspan="6" class="bg-white-light/40 dark:bg-dark/40">
                                                <div class="space-y-4 p-3">
                                                    <div v-if="d.next_retry_at" class="text-xs text-white-dark">
                                                        Next retry: {{ fmtTime(d.next_retry_at) }}
                                                    </div>
                                                    <div>
                                                        <div class="mb-1 text-xs font-semibold text-white-dark">Payload</div>
                                                        <pre class="max-h-64 overflow-auto rounded border border-white-light bg-white p-3 font-mono text-xs dark:border-dark dark:bg-black">{{ fmtJson(d.payload) }}</pre>
                                                    </div>
                                                    <div v-if="d.response_body || d.error">
                                                        <div class="mb-1 text-xs font-semibold text-white-dark">
                                                            {{ d.success ? `Response (${d.status_code})` : 'Error' }}
                                                        </div>
                                                        <pre class="max-h-64 overflow-auto rounded border border-white-light bg-white p-3 font-mono text-xs dark:border-dark dark:bg-black">{{ d.error || d.response_body }}</pre>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div v-if="deliveries && deliveries.meta.pages > 1" class="flex items-center justify-between text-sm text-white-dark">
                        <div>Page {{ deliveries.meta.page }} of {{ deliveries.meta.pages }} — {{ deliveries.meta.total }} total</div>
                        <div class="flex gap-2">
                            <button type="button" class="btn btn-outline-primary btn-sm" :disabled="deliveriesPage <= 1" @click="deliveriesPage--">Prev</button>
                            <button type="button" class="btn btn-outline-primary btn-sm" :disabled="deliveriesPage >= deliveries.meta.pages" @click="deliveriesPage++">Next</button>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <!-- Rotate secret dialog -->
        <div v-if="rotateOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
            <div class="panel w-full max-w-lg overflow-hidden rounded-lg border-0 p-0">
                <div
                    class="flex items-center justify-between py-3 px-5"
                    :class="newSecret ? 'bg-success-light dark:bg-success/10' : 'bg-[#fbfbfb] dark:bg-[#121c2c]'"
                >
                    <h5 class="flex items-center gap-2 text-lg font-bold" :class="newSecret ? 'text-success' : 'dark:text-white-light'">
                        <icon-circle-check v-if="newSecret" class="h-5 w-5" />
                        <icon-refresh v-else class="h-5 w-5 text-warning" />
                        {{ newSecret ? 'Save the new secret' : 'Rotate the signing secret?' }}
                    </h5>
                    <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="closeRotate">
                        <icon-x class="h-5 w-5" />
                    </button>
                </div>
                <div class="p-5">
                    <p class="mb-4 text-sm text-white-dark">
                        {{ newSecret
                            ? "This is the only time we'll show you the new secret."
                            : 'The current secret will stop working as soon as a new one is generated.' }}
                    </p>

                    <div v-if="newSecret" class="flex items-center gap-2 rounded border border-success/50 bg-success-light p-3 dark:bg-success/10">
                        <span class="flex-1 break-all font-mono text-sm">{{ newSecret }}</span>
                        <OrbCopyButton :value="newSecret" label="Copy" />
                    </div>

                    <div class="mt-6 flex justify-end gap-2">
                        <template v-if="!newSecret">
                            <button type="button" class="btn btn-outline-primary" @click="closeRotate">Cancel</button>
                            <button type="button" class="btn btn-warning" :disabled="rotating" @click="onRotate">
                                {{ rotating ? 'Rotating…' : 'Rotate secret' }}
                            </button>
                        </template>
                        <button v-else type="button" class="btn btn-primary" @click="closeRotate">Done</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
