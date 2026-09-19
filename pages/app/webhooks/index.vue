<script lang="ts" setup>
import type { Webhook, WebhookEvent } from '@/composables/useWebhooks'

useHead({ title: 'Webhooks' })

const { success: toastSuccess, error: toastError, confirm } = useToast()

const { data: webhooks, pending, error, refresh } = await useAsyncData('app-webhooks', () => listWebhooks())

type DialogStage = 'closed' | 'form' | 'secret'
const stage = ref<DialogStage>('closed')

const formName = ref('')
const formUrl = ref('')
const formEvents = ref<WebhookEvent[]>([])
const submitting = ref(false)
const submitError = ref('')
const created = ref<Webhook | null>(null)

function openCreate() {
  formName.value = ''
  formUrl.value = ''
  formEvents.value = []
  submitError.value = ''
  created.value = null
  stage.value = 'form'
}

function closeDialog() {
  stage.value = 'closed'
  created.value = null
}

function toggleEvent(e: WebhookEvent) {
  const i = formEvents.value.indexOf(e)
  if (i >= 0) formEvents.value.splice(i, 1)
  else formEvents.value.push(e)
}

async function onSubmit() {
  if (submitting.value) return
  submitError.value = ''
  if (!formName.value.trim()) {
    submitError.value = 'Name is required.'
    return
  }
  if (!formUrl.value.trim()) {
    submitError.value = 'URL is required.'
    return
  }
  if (formEvents.value.length === 0) {
    submitError.value = 'Select at least one event.'
    return
  }
  submitting.value = true
  try {
    const hook = await createWebhook({
      name: formName.value.trim(),
      url: formUrl.value.trim(),
      events: formEvents.value,
    })
    created.value = hook
    stage.value = 'secret'
    await refresh()
  }
  catch (e) {
    submitError.value = errMsg(e, 'Could not create webhook')
  }
  finally {
    submitting.value = false
  }
}

// Toggle active straight from the list.
async function toggleActive(w: Webhook) {
  try {
    await updateWebhook(w.id, { active: !w.active })
    await refresh()
    toastSuccess(w.active ? 'Webhook paused.' : 'Webhook activated.')
  }
  catch (e) {
    toastError(errMsg(e, 'Could not update webhook'))
  }
}

async function askDelete(w: Webhook) {
  const ok = await confirm({
    title: 'Delete this webhook?',
    text: `${w.name} will stop receiving events. This cannot be undone.`,
    confirmText: 'Delete webhook',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteWebhook(w.id)
    toastSuccess('Webhook deleted.')
    await refresh()
  }
  catch (e) {
    toastError(errMsg(e, 'Could not delete webhook'))
  }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
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
                <span>Webhooks</span>
            </li>
        </ul>

        <div class="pt-5">
            <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 class="text-2xl font-semibold dark:text-white-light">Webhooks</h2>
                    <p class="mt-1 max-w-2xl text-white-dark">Receive event notifications when things happen in your organization.</p>
                </div>
                <button type="button" class="btn btn-primary gap-2" @click="openCreate">
                    <icon-plus class="h-4 w-4" /> Add webhook
                </button>
            </div>

            <!-- Load error -->
            <div v-if="error" class="mb-5 rounded border border-danger/50 bg-danger-light p-4 text-danger dark:bg-danger/10">
                {{ errMsg(error, 'Could not load webhooks') }}
            </div>

            <!-- Loading -->
            <div v-if="pending && !webhooks" class="panel">
                <div class="space-y-3">
                    <div class="h-5 w-48 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                    <div class="h-5 w-72 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                    <div class="h-5 w-40 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="!webhooks?.length" class="panel">
                <div class="flex flex-col items-center gap-4 py-14 text-center">
                    <div class="grid h-16 w-16 place-content-center rounded-2xl bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                        <icon-link class="h-7 w-7" />
                    </div>
                    <div>
                        <div class="text-lg font-semibold dark:text-white-light">No webhooks yet</div>
                        <div class="text-sm text-white-dark">Get notified when emails are delivered, domains verify, and more.</div>
                    </div>
                    <button type="button" class="btn btn-primary gap-2" @click="openCreate">
                        <icon-plus class="h-4 w-4" /> Add your first webhook
                    </button>
                </div>
            </div>

            <!-- Table -->
            <div v-else class="panel p-0">
                <div class="mb-5 flex items-center justify-between border-b border-white-light px-5 pt-5 pb-4 dark:border-[#1b2e4b]">
                    <h5 class="text-lg font-semibold dark:text-white-light">All webhooks</h5>
                    <span class="badge bg-primary/20 text-primary dark:bg-primary dark:text-white">{{ webhooks.length }} total</span>
                </div>
                <div class="table-responsive">
                    <table class="table-hover whitespace-nowrap">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>URL</th>
                                <th class="text-right">Events</th>
                                <th>Status</th>
                                <th>Added</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="w in webhooks"
                                :key="w.id"
                                class="group cursor-pointer"
                                @click="navigateTo(`/app/webhooks/${w.id}`)"
                            >
                                <td>
                                    <div class="flex items-center gap-3">
                                        <div class="grid h-9 w-9 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
                                            <icon-link class="h-4.5 w-4.5" />
                                        </div>
                                        <span class="font-semibold text-dark group-hover:text-primary dark:text-white-light">{{ w.name }}</span>
                                    </div>
                                </td>
                                <td class="max-w-[36ch] truncate font-mono text-xs text-white-dark">{{ w.url }}</td>
                                <td class="text-right">
                                    <span class="badge badge-outline-primary tabular-nums">{{ w.events.length }}</span>
                                </td>
                                <td>
                                    <span class="badge" :class="w.active ? 'bg-success' : 'bg-warning'">{{ w.active ? 'Active' : 'Paused' }}</span>
                                </td>
                                <td class="text-xs text-white-dark">{{ fmtDate(w.created_at) }}</td>
                                <td class="text-center" @click.stop>
                                    <div class="flex justify-center gap-2">
                                        <button
                                            type="button"
                                            class="btn btn-sm"
                                            :class="w.active ? 'btn-outline-warning' : 'btn-outline-success'"
                                            @click="toggleActive(w)"
                                        >
                                            {{ w.active ? 'Pause' : 'Activate' }}
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-outline-danger btn-sm"
                                            :aria-label="`Delete ${w.name}`"
                                            @click="askDelete(w)"
                                        >
                                            <icon-trash class="h-4 w-4" />
                                        </button>
                                    </div>
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
            <div v-if="stage === 'form'" class="panel w-full max-w-lg overflow-hidden rounded-lg border-0 p-0">
                <div class="flex items-center justify-between bg-[#fbfbfb] py-3 px-5 dark:bg-[#121c2c]">
                    <h5 class="text-lg font-bold dark:text-white-light">New webhook</h5>
                    <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="closeDialog">
                        <icon-x class="h-5 w-5" />
                    </button>
                </div>
                <p class="px-5 pt-5 text-sm text-white-dark">We'll POST events to your URL with a signed body. The signing secret is shown once.</p>
                <form class="space-y-4 p-5" @submit.prevent="onSubmit">
                    <div>
                        <label for="hook-name" class="mb-1.5 block font-semibold">Name</label>
                        <input id="hook-name" v-model="formName" type="text" class="form-input" placeholder="Production delivery hook" required />
                    </div>
                    <div>
                        <label for="hook-url" class="mb-1.5 block font-semibold">URL</label>
                        <input id="hook-url" v-model="formUrl" type="url" class="form-input" placeholder="https://example.com/orb-webhook" required />
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
                    <div v-if="submitError" class="rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
                        {{ submitError }}
                    </div>
                    <div class="flex justify-end gap-2">
                        <button type="button" class="btn btn-outline-primary" @click="closeDialog">Cancel</button>
                        <button type="submit" class="btn btn-primary" :disabled="submitting">
                            {{ submitting ? 'Creating…' : 'Create webhook' }}
                        </button>
                    </div>
                </form>
            </div>

            <!-- Reveal secret (shown ONCE) -->
            <div v-else-if="stage === 'secret' && created" class="panel w-full max-w-lg overflow-hidden rounded-lg border-0 p-0">
                <div class="flex items-center justify-between bg-success-light py-3 px-5 dark:bg-success/10">
                    <h5 class="flex items-center gap-2 text-lg font-bold text-success">
                        <icon-circle-check class="h-5 w-5" /> Save your signing secret
                    </h5>
                    <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="closeDialog">
                        <icon-x class="h-5 w-5" />
                    </button>
                </div>
                <div class="p-5">
                    <p class="mb-4 text-sm text-white-dark">
                        This is the only time we'll show you the plaintext secret. Store it somewhere safe — you can rotate it later if you lose it.
                    </p>

                    <div class="mb-4 flex items-start gap-2 rounded border border-warning/50 bg-warning-light p-3 text-sm text-warning-dark dark:bg-warning/10">
                        <icon-info-circle class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <span class="dark:text-warning">
                            Use this with HMAC-SHA256 over <code class="font-mono text-xs">timestamp + "." + body</code> to verify the <code class="font-mono text-xs">X-Orb-Signature</code> header.
                        </span>
                    </div>

                    <div class="flex items-center gap-2 rounded border border-success/50 bg-success-light p-3 dark:bg-success/10">
                        <span class="flex-1 break-all font-mono text-sm">{{ created.secret }}</span>
                        <OrbCopyButton :value="created.secret ?? ''" label="Copy" />
                    </div>

                    <div class="mt-6 flex justify-end">
                        <button type="button" class="btn btn-primary" @click="navigateTo(`/app/webhooks/${created!.id}`)">Continue</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
