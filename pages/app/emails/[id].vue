<script setup lang="ts">
import type { Component } from 'vue'
import type { Email } from '@/composables/useEmails'
// Imported, not named by string: `<component :is>` resolves a string against
// registered components, and Nuxt's auto-import works off the template at build
// time - so an icon named only in a runtime value renders as nothing.
import IconGallery from '@/components/icon/icon-gallery.vue'
import IconZipFile from '@/components/icon/icon-zip-file.vue'
import IconTxtFile from '@/components/icon/icon-txt-file.vue'

const route = useRoute()
const id = computed(() => String(route.params.id))
const { success, error: toastError, confirm } = useToast()

useHead({ title: 'Email' })

const { data: email, pending, error, refresh: refreshEmail } = await useAsyncData(
  'email-detail',
  () => getEmail(id.value),
  { watch: [id] },
)

// Lazy side-loads: attachments + thread populate after the body renders.
const { data: attachments, refresh: refreshAttachments } = useAsyncData(
  'email-attachments',
  async () => (email.value?.has_attachments ? listAttachments(id.value) : []),
  { watch: [email], lazy: true, default: () => [] },
)

const { data: thread } = useAsyncData(
  'email-thread',
  () => getThread(id.value),
  { watch: [id], lazy: true, default: () => [] as Email[] },
)
const otherMessages = computed(() => (thread.value ?? []).filter(m => m.id !== id.value))

// Opening the email marks it read server-side (the GET handler). If we landed
// on an inbound message that was still unread, drop the sidebar badge
// optimistically — the WS unread_count event reconciles the authoritative total.
const unread = useUnreadEmails()
onMounted(() => {
  if (email.value?.direction === 'inbound' && email.value.read === false) {
    unread.decrement()
  }
})

// Realtime: backend re-broadcasts new_email after the inbound .eml is parsed.
const realtime = useRealtime()
realtime.useOn('new_email', (e) => {
  if (e.id !== email.value?.id) return
  email.value = e
  refreshAttachments()
})
realtime.useOn('email_status_update', ({ id: eid, status }) => {
  if (email.value && email.value.id === eid) email.value.status = status
})

// --- HTML body (sandboxed iframe) -------------------------------------------
// Build script tag delimiters char-by-char so Vue's SFC tokenizer doesn't
// prematurely close the <script setup> block.
const _LT = String.fromCharCode(60)
const _GT = String.fromCharCode(62)
const SCRIPT_OPEN = _LT + 'script' + _GT
const SCRIPT_CLOSE = _LT + '/script' + _GT

const bodyHeight = ref(180)

const bodySrcdoc = computed(() => {
  if (!email.value?.html_body) return ''
  const head = '<!DOCTYPE html><html><head><base target="_blank"><style>html,body{margin:0}body{padding:12px;font-family:system-ui,-apple-system,sans-serif;color:#0a0a0a}img{max-width:100%;height:auto}</style></head><body>'
  const injected = SCRIPT_OPEN
    + 'function postSize(){var h=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);window.parent.postMessage({type:"orb:resize",h:h},"*");}'
    + 'window.addEventListener("load",function(){postSize();var imgs=document.querySelectorAll("img");for(var i=0;i<imgs.length;i++){imgs[i].addEventListener("load",postSize);}});'
    + 'if(typeof ResizeObserver!=="undefined"){new ResizeObserver(postSize).observe(document.body);}'
    + 'postSize();'
    + SCRIPT_CLOSE
  return head + email.value.html_body + injected + '</body></html>'
})

function onIframeMessage(ev: MessageEvent) {
  if (!ev.data || typeof ev.data !== 'object') return
  if (ev.data.type === 'orb:resize' && typeof ev.data.h === 'number' && Number.isFinite(ev.data.h)) {
    const max = Math.floor((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.8)
    bodyHeight.value = Math.max(120, Math.min(max, Math.ceil(ev.data.h) + 24))
  }
}
onMounted(() => window.addEventListener('message', onIframeMessage))
onBeforeUnmount(() => window.removeEventListener('message', onIframeMessage))

// --- Folder-derived state ---------------------------------------------------
const isTrashed = computed(() => !!email.value?.deleted_at)
const isSpam = computed(() => !!email.value?.spam && !email.value?.deleted_at)
const isArchived = computed(() => !!email.value?.archived && !email.value?.deleted_at && !email.value?.spam)
const isInbound = computed(() => email.value?.direction === 'inbound')
const isStarred = computed(() => !!email.value?.starred)

const acting = ref(false)

// Reversible folder moves — toast then return to the list.
async function runAction(fn: (id: string) => Promise<void>, ok: string, fail: string) {
  if (acting.value) return
  acting.value = true
  try {
    await fn(id.value)
    success(ok)
    await navigateTo({ path: '/app/emails', query: route.query.folder ? { folder: route.query.folder } : {} })
  }
  catch (e) {
    toastError(errMsg(e, fail))
    acting.value = false
  }
}
async function onMoveToTrash() {
  const ok = await confirm({
    title: 'Move to Trash?',
    text: 'This message will be moved to Trash. You can restore it from there.',
    confirmText: 'Move to Trash',
    danger: true,
  })
  if (!ok) return
  await runAction(trashEmail, 'Moved to Trash.', 'Could not move to Trash')
}
async function onRestore() {
  const ok = await confirm({
    title: 'Restore this email?',
    text: 'It will be moved back to your inbox.',
    confirmText: 'Restore',
  })
  if (!ok) return
  await runAction(restoreEmail, 'Restored.', 'Could not restore')
}
const onReportSpam = () => runAction(markSpam, 'Reported as spam.', 'Could not report spam')
const onNotSpam = () => runAction(markNotSpam, 'Marked as not spam.', 'Could not update')
const onArchive = () => runAction(archiveEmail, 'Archived.', 'Could not archive')
const onUnarchive = () => runAction(unarchiveEmail, 'Moved to Inbox.', 'Could not unarchive')

async function onMarkUnread() {
  if (acting.value) return
  acting.value = true
  try {
    await markUnread(id.value)
    success('Marked as unread.')
    await navigateTo({ path: '/app/emails', query: route.query.folder ? { folder: route.query.folder } : {} })
  }
  catch (e) {
    toastError(errMsg(e, 'Could not mark unread'))
    acting.value = false
  }
}

async function onDeleteForever() {
  const ok = await confirm({
    title: 'Delete this email forever?',
    text: 'The message and all attachments will be permanently removed. This cannot be undone.',
    confirmText: 'Delete forever',
    danger: true,
  })
  if (!ok) return
  acting.value = true
  try {
    await deleteEmailForever(id.value)
    success('Email permanently deleted.')
    await navigateTo({ path: '/app/emails', query: route.query.folder ? { folder: route.query.folder } : {} })
  }
  catch (e) {
    toastError(errMsg(e, 'Could not delete email'))
    acting.value = false
  }
}

// Star toggles optimistically without navigating away.
async function onToggleStar() {
  if (!email.value || acting.value) return
  const was = !!email.value.starred
  email.value.starred = !was
  try {
    await (was ? unstarEmail(id.value) : starEmail(id.value))
  }
  catch (e) {
    email.value.starred = was
    toastError(errMsg(e, 'Could not update'))
  }
}

const { openCompose } = useCompose()
function onReply() {
  if (!email.value) return
  openCompose({ replyId: email.value.id })
}

// --- Labels -----------------------------------------------------------------
const labelOpen = ref(false)
const labelInput = ref('')
const labelSaving = ref(false)
const labelError = ref('')

function openAddLabel() {
  labelInput.value = ''
  labelError.value = ''
  labelOpen.value = true
}
async function submitAddLabel() {
  if (!email.value || labelSaving.value) return
  const label = labelInput.value.trim()
  labelError.value = ''
  if (!label) { labelError.value = 'Enter a label.'; return }
  if (label.length > 40) { labelError.value = 'Label is too long (max 40 chars).'; return }
  if ((email.value.labels ?? []).includes(label)) { labelOpen.value = false; return }
  labelSaving.value = true
  email.value.labels = [...(email.value.labels ?? []), label]
  try {
    await addLabel(id.value, label)
    labelOpen.value = false
  }
  catch (e) {
    email.value.labels = (email.value.labels ?? []).filter(l => l !== label)
    labelError.value = errMsg(e, 'Could not add label')
  }
  finally {
    labelSaving.value = false
  }
}
async function onRemoveLabel(label: string) {
  if (!email.value) return
  const prev = email.value.labels ?? []
  email.value.labels = prev.filter(l => l !== label)
  try {
    await removeLabel(id.value, label)
  }
  catch (e) {
    email.value.labels = prev
    toastError(errMsg(e, 'Could not remove label'))
  }
}

// --- Attachments ------------------------------------------------------------
async function onDownload(attachmentId: string) {
  try {
    const url = await getAttachmentUrl(attachmentId)
    window.open(url, '_blank', 'noopener')
  }
  catch (e) {
    toastError(errMsg(e, 'Could not get download URL'))
  }
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 ** 2).toFixed(1)} MB`
}
function fmtDate(s: string) {
  return new Date(s).toLocaleString()
}
function snippet(m: Email): string {
  return (m.text_body || (m.html_body || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 140) || '(no preview)'
}

// Sender avatar initials, mirroring Vristo's mailbox reading pane.
const senderInitials = computed(() => {
  const name = (email.value?.from ?? '').replace(/<.*>/, '').trim()
  const at = name.indexOf('@')
  const base = at > 0 ? name.slice(0, at) : name
  const parts = base.split(/[.\s_-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return (base.slice(0, 2) || '?').toUpperCase()
})
function attachmentIcon(contentType: string): Component {
  if (contentType?.startsWith('image/')) return IconGallery
  if (contentType?.includes('zip')) return IconZipFile
  return IconTxtFile
}
</script>

<template>
    <div>
        <ul class="flex space-x-2 rtl:space-x-reverse">
            <li>
                <NuxtLink :to="{ path: '/app/emails', query: route.query.folder ? { folder: route.query.folder } : {} }" class="text-primary hover:underline">Emails</NuxtLink>
            </li>
            <li class="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                <span class="truncate">{{ email?.subject || 'Email' }}</span>
            </li>
        </ul>

        <!-- Error -->
        <div v-if="error" class="panel mt-5 border border-danger bg-danger-light text-danger dark:bg-danger/10">
            {{ errMsg(error, 'Could not load email') }}
        </div>

        <!-- Loading -->
        <div v-else-if="pending && !email" class="panel mt-5 space-y-3">
            <div class="h-7 w-2/3 animate-pulse rounded bg-white-light dark:bg-[#1b2e4b]"></div>
            <div class="h-24 w-full animate-pulse rounded bg-white-light dark:bg-[#1b2e4b]"></div>
            <div class="h-64 w-full animate-pulse rounded bg-white-light dark:bg-[#1b2e4b]"></div>
        </div>

        <template v-else-if="email">
            <div class="panel mt-5 p-0">
                <!-- Header: back + subject + type badge + toolbar -->
                <div class="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div class="flex min-w-0 items-center">
                        <NuxtLink
                            :to="{ path: '/app/emails', query: route.query.folder ? { folder: route.query.folder } : {} }"
                            class="hover:text-primary ltr:mr-2 rtl:ml-2"
                            aria-label="Back to list"
                        >
                            <icon-arrow-left class="h-5 w-5 rtl:rotate-180" />
                        </NuxtLink>
                        <h4 class="truncate text-base font-medium ltr:mr-2 rtl:ml-2 md:text-lg">{{ email.subject || '(no subject)' }}</h4>
                        <orb-email-status-pill :status="email.status" class="shrink-0 ltr:mr-2 rtl:ml-2" />
                        <span
                            v-if="email.has_attachments"
                            class="inline-flex shrink-0 items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-xs font-semibold text-info"
                            :title="`${attachments?.length || ''} attachment${(attachments?.length || 0) === 1 ? '' : 's'}`"
                        >
                            <icon-paperclip class="h-3.5 w-3.5" />{{ attachments?.length || '' }}
                        </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1">
                        <button v-if="isTrashed" type="button" class="btn btn-sm btn-outline-primary gap-1" :disabled="acting" @click="onRestore">
                            <icon-restore class="h-4 w-4" /> Restore
                        </button>
                        <button v-else-if="isSpam" type="button" class="btn btn-sm btn-outline-primary gap-1" :disabled="acting" @click="onNotSpam">
                            <icon-circle-check class="h-4 w-4" /> Not spam
                        </button>
                        <template v-else>
                            <button type="button" class="btn btn-sm btn-primary gap-1" @click="onReply">
                                <icon-arrow-backward class="h-4 w-4 rtl:hidden" /><icon-arrow-forward class="h-4 w-4 ltr:hidden" /> Reply
                            </button>
                            <button v-if="!isArchived" type="button" class="btn btn-sm btn-outline-primary" title="Archive" :disabled="acting" @click="onArchive">
                                <icon-archive class="h-4 w-4" />
                            </button>
                            <button v-else type="button" class="btn btn-sm btn-outline-primary" title="Move to Inbox" :disabled="acting" @click="onUnarchive">
                                <icon-inbox class="h-4 w-4" />
                            </button>
                            <button v-if="isInbound" type="button" class="btn btn-sm btn-outline-primary" title="Mark unread" :disabled="acting" @click="onMarkUnread">
                                <icon-mail class="h-4 w-4" />
                            </button>
                            <button v-if="isInbound" type="button" class="btn btn-sm btn-outline-primary" title="Report spam" :disabled="acting" @click="onReportSpam">
                                <icon-info-hexagon class="h-4 w-4" />
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" title="Move to Trash" :disabled="acting" @click="onMoveToTrash">
                                <icon-trash-lines class="h-4 w-4" />
                            </button>
                        </template>
                        <button v-if="isTrashed || isSpam" type="button" class="btn btn-sm btn-danger gap-1" :disabled="acting" @click="onDeleteForever">
                            <icon-trash-lines class="h-4 w-4" /> Delete forever
                        </button>
                    </div>
                </div>
                <div class="h-px border-b border-[#e0e6ed] dark:border-[#1b2e4b]"></div>

                <!-- Sender block -->
                <div class="relative p-4">
                    <div class="flex flex-wrap items-start">
                        <div class="flex-shrink-0 ltr:mr-3 rtl:ml-3">
                            <div class="grid h-12 w-12 place-content-center rounded-full bg-primary-light text-sm font-semibold uppercase text-primary dark:bg-[#060818]">
                                {{ senderInitials }}
                            </div>
                        </div>
                        <div class="flex-1 ltr:mr-2 rtl:ml-2">
                            <div class="flex flex-wrap items-center">
                                <div class="whitespace-nowrap text-lg ltr:mr-4 rtl:ml-4">{{ email.from }}</div>
                                <div class="whitespace-nowrap text-white-dark">{{ fmtDate(email.created_at) }}</div>
                            </div>
                            <div class="flex items-center text-white-dark">
                                <div class="ltr:mr-1 rtl:ml-1">to {{ email.to.join(', ') }}</div>
                                <client-only>
                                    <Popper :placement="'bottom-start'" offset-distance="0" class="align-middle">
                                        <button type="button" class="mt-1.5">
                                            <icon-caret-down class="h-5 w-5" />
                                        </button>
                                        <template #content>
                                            <ul class="sm:w-72">
                                                <li>
                                                    <div class="flex items-start px-4 py-2">
                                                        <div class="w-1/4 text-white-dark ltr:mr-2 rtl:ml-2">From:</div>
                                                        <div class="flex-1 break-all">{{ email.from }}</div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div class="flex items-start px-4 py-2">
                                                        <div class="w-1/4 text-white-dark ltr:mr-2 rtl:ml-2">To:</div>
                                                        <div class="flex-1 break-all">{{ email.to.join(', ') }}</div>
                                                    </div>
                                                </li>
                                                <li v-if="email.cc?.length">
                                                    <div class="flex items-start px-4 py-2">
                                                        <div class="w-1/4 text-white-dark ltr:mr-2 rtl:ml-2">Cc:</div>
                                                        <div class="flex-1 break-all">{{ email.cc.join(', ') }}</div>
                                                    </div>
                                                </li>
                                                <li v-if="email.bcc?.length">
                                                    <div class="flex items-start px-4 py-2">
                                                        <div class="w-1/4 text-white-dark ltr:mr-2 rtl:ml-2">Bcc:</div>
                                                        <div class="flex-1 break-all">{{ email.bcc.join(', ') }}</div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div class="flex items-start px-4 py-2">
                                                        <div class="w-1/4 text-white-dark ltr:mr-2 rtl:ml-2">Date:</div>
                                                        <div class="flex-1">{{ fmtDate(email.created_at) }}</div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div class="flex items-start px-4 py-2">
                                                        <div class="w-1/4 text-white-dark ltr:mr-2 rtl:ml-2">Subject:</div>
                                                        <div class="flex-1">{{ email.subject || '(no subject)' }}</div>
                                                    </div>
                                                </li>
                                            </ul>
                                        </template>
                                    </Popper>
                                </client-only>
                            </div>
                        </div>
                        <div class="flex items-center justify-center space-x-3 rtl:space-x-reverse">
                            <button
                                type="button"
                                class="enabled:hover:text-warning disabled:opacity-60"
                                :class="{ 'text-warning': isStarred }"
                                :title="isStarred ? 'Unstar' : 'Star'"
                                :disabled="acting || isTrashed"
                                @click="onToggleStar"
                            >
                                <icon-star :class="{ 'fill-warning': isStarred }" />
                            </button>
                            <button v-if="!isTrashed && !isSpam" type="button" class="hover:text-info" title="Reply" @click="onReply">
                                <icon-arrow-backward class="rtl:hidden" /><icon-arrow-forward class="ltr:hidden" />
                            </button>
                        </div>
                    </div>

                    <!-- Labels -->
                    <div class="mt-6 flex flex-wrap items-center gap-2">
                        <span
                            v-for="l in email.labels ?? []"
                            :key="l"
                            class="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs dark:bg-[#060818]"
                        >
                            <icon-tag class="h-3 w-3" /> {{ l }}
                            <button type="button" class="hover:text-danger" :aria-label="`Remove label ${l}`" @click="onRemoveLabel(l)">
                                <icon-x class="h-3 w-3" />
                            </button>
                        </span>
                        <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-full border border-dashed border-white-light px-2 py-0.5 text-xs text-white-dark hover:border-primary hover:text-primary dark:border-[#1b2e4b]"
                            @click="openAddLabel"
                        >
                            <icon-plus class="h-3 w-3" /> Add label
                        </button>
                    </div>

                    <!-- Conversation strip -->
                    <div v-if="otherMessages.length" class="mt-6 space-y-2">
                        <h3 class="text-xs font-medium text-white-dark">{{ otherMessages.length + 1 }} messages in this conversation</h3>
                        <NuxtLink
                            v-for="m in otherMessages"
                            :key="m.id"
                            :to="`/app/emails/${m.id}`"
                            class="block rounded-md border border-white-light px-3 py-2 text-sm transition-colors hover:bg-primary-light/40 dark:border-[#1b2e4b] dark:hover:bg-[#1b2e4b]"
                        >
                            <div class="flex items-center justify-between gap-2">
                                <span class="truncate font-medium">{{ m.direction === 'outbound' ? `To: ${m.to?.[0] ?? '—'}` : m.from }}</span>
                                <span class="shrink-0 text-xs text-white-dark">{{ fmtDate(m.created_at) }}</span>
                            </div>
                            <div class="truncate text-xs text-white-dark">{{ snippet(m) }}</div>
                        </NuxtLink>
                    </div>

                    <!-- Body -->
                    <div class="mt-8">
                        <iframe
                            v-if="email.html_body"
                            class="w-full rounded-md bg-white transition-all duration-150"
                            :style="{ height: `${bodyHeight}px` }"
                            sandbox="allow-scripts"
                            :srcdoc="bodySrcdoc"
                            title="Email body"
                        ></iframe>
                        <pre v-else-if="email.text_body" class="whitespace-pre-wrap font-sans text-sm leading-relaxed">{{ email.text_body }}</pre>
                        <div v-else class="py-6 text-center text-sm text-white-dark">(no body)</div>
                    </div>

                    <!-- Attachments -->
                    <div v-if="attachments?.length" class="mt-8">
                        <div class="mb-4 text-base">Attachments</div>
                        <div class="h-px border-b border-[#e0e6ed] dark:border-[#1b2e4b]"></div>
                        <p class="mt-3 text-xs text-white-dark">Downloads use a short-lived pre-signed S3 URL.</p>
                        <div class="mt-4 flex flex-wrap items-center">
                            <button
                                v-for="a in attachments"
                                :key="a.id"
                                type="button"
                                class="group relative mb-4 flex items-center rounded-md border border-[#e0e6ed] px-4 py-2.5 transition-all duration-300 hover:border-primary hover:text-primary ltr:mr-4 rtl:ml-4 dark:border-[#1b2e4b]"
                                @click="onDownload(a.id)"
                            >
                                <component :is="attachmentIcon(a.content_type)" class="h-5 w-5" />
                                <div class="ltr:ml-3 rtl:mr-3 text-left">
                                    <p class="text-xs font-semibold text-primary">{{ a.filename }}</p>
                                    <p class="text-[11px] text-gray-400 dark:text-gray-600">{{ fmtBytes(a.size) }}</p>
                                </div>
                                <div class="absolute top-0 z-[5] hidden h-full w-full rounded-md bg-dark-light/40 group-hover:block ltr:left-0 rtl:right-0"></div>
                                <div class="btn btn-primary absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full p-1 group-hover:block">
                                    <icon-download class="h-4.5 w-4.5" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <!-- Add-label modal -->
        <div v-if="labelOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" @click.self="labelOpen = false">
            <div class="panel w-full max-w-sm">
                <h3 class="mb-1 text-lg font-semibold">Add a label</h3>
                <p class="mb-4 text-sm text-white-dark">Labels help you organize and filter messages.</p>
                <form class="space-y-3" @submit.prevent="submitAddLabel">
                    <input v-model="labelInput" maxlength="40" placeholder="e.g. Design" class="form-input" autofocus />
                    <p v-if="labelError" class="text-sm text-danger">{{ labelError }}</p>
                    <div class="flex justify-end gap-2">
                        <button type="button" class="btn btn-outline-primary" @click="labelOpen = false">Cancel</button>
                        <button type="submit" class="btn btn-primary" :disabled="labelSaving">{{ labelSaving ? 'Adding…' : 'Add label' }}</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
