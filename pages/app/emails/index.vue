<script setup lang="ts">
import type { Email, EmailDirection, EmailFolder } from '@/composables/useEmails'
import IconInbox from '@/components/icon/icon-inbox.vue'
import IconStar from '@/components/icon/icon-star.vue'
import IconSend from '@/components/icon/icon-send.vue'
import IconFile from '@/components/icon/icon-file.vue'
import IconArchive from '@/components/icon/icon-archive.vue'
import IconInfoHexagon from '@/components/icon/icon-info-hexagon.vue'
import IconTrashLines from '@/components/icon/icon-trash-lines.vue'

useHead({ title: 'Emails' })

const route = useRoute()
const router = useRouter()

// Compose is only available to users whose account email sits on a verified org
// domain. Hidden otherwise.
const { canCompose, ensureComposeData } = useCanCompose()
ensureComposeData()
const { openCompose } = useCompose()

const { error: toastError, confirm } = useToast()

const folders: { key: EmailFolder, label: string, icon: any }[] = [
  { key: 'inbox', label: 'Inbox', icon: IconInbox },
  { key: 'starred', label: 'Starred', icon: IconStar },
  { key: 'sent', label: 'Sent', icon: IconSend },
  { key: 'drafts', label: 'Drafts', icon: IconFile },
  { key: 'archive', label: 'Archive', icon: IconArchive },
  { key: 'spam', label: 'Spam', icon: IconInfoHexagon },
  { key: 'trash', label: 'Trash', icon: IconTrashLines },
]

const folder = computed<EmailFolder>(() => {
  const f = String(route.query.folder ?? 'inbox')
  return folders.some(x => x.key === f) ? f as EmailFolder : 'inbox'
})
const search = ref(String(route.query.q ?? ''))
const page = computed(() => Math.max(1, Number(route.query.page ?? 1) || 1))
const perPage = 20

// No domain filter: a user only ever sees their OWN mailbox (the API scopes
// every folder to the caller). Cross-domain/org browsing isn't allowed.
const filter = computed(() => ({
  folder: folder.value,
  q: search.value.trim() || undefined,
  limit: perPage,
  offset: (page.value - 1) * perPage,
}))

const { data, pending, error, refresh } = useAsyncData(
  'emails-list',
  () => listEmails(filter.value),
  { watch: [filter], lazy: true },
)

// Realtime: prepend newly-arrived inbound mail on Inbox page 1; apply status
// updates in place regardless of folder.
const realtime = useRealtime()
realtime.useOn('new_email', (email) => {
  if (!data.value) return
  if (page.value !== 1 || folder.value !== 'inbox') return
  if (email.direction !== 'inbound' || email.spam || email.deleted_at) return
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    const hay = `${email.subject ?? ''} ${email.from ?? ''} ${email.to?.join(' ') ?? ''}`.toLowerCase()
    if (!hay.includes(q)) return
  }
  const existingIdx = data.value.items.findIndex(e => e.id === email.id)
  if (existingIdx >= 0) {
    data.value.items[existingIdx] = email
    return
  }
  data.value.items.unshift(email)
  data.value.meta.total += 1
  if (data.value.items.length > perPage) data.value.items.pop()
})
realtime.useOn('email_status_update', ({ id, status }) => {
  if (!data.value) return
  const row = data.value.items.find(e => e.id === id)
  if (row) row.status = status
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    router.replace({ query: { ...route.query, q: v || undefined, page: undefined } })
  }, 250)
})

function selectFolder(key: EmailFolder) {
  router.replace({ query: { ...route.query, folder: key === 'inbox' ? undefined : key, page: undefined } })
}

function setPage(p: number) {
  router.replace({ query: { ...route.query, page: p > 1 ? p : undefined } })
}

const folderMeta = computed(() => folders.find(f => f.key === folder.value) ?? folders[0]!)

const pageNumbers = computed<(number | '…')[]>(() => {
  const total = data.value?.meta?.pages ?? 1
  const cur = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(total - 1, cur + 1)
  if (start > 2) out.push('…')
  for (let p = start; p <= end; p++) out.push(p)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
})

function fmtListDate(s: string): string {
  const d = new Date(s)
  const now = new Date()
  const sameYear = d.getFullYear() === now.getFullYear()
  return sameYear
    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
}

function recipient(email: { direction: EmailDirection, from: string, to: string[] }) {
  return email.direction === 'outbound' ? (email.to[0] ?? '—') : email.from
}

function preview(e: Email): string {
  return (e.text_body ?? (e.html_body || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 120)
}

const unread = useUnreadEmails()

function rowTarget(e: Email) {
  const carryFolder = folder.value !== 'inbox' ? { folder: folder.value } : {}
  if (e.status === 'draft' && folder.value === 'drafts') {
    return { path: '/app/emails/new', query: { ...carryFolder, draft: e.id } }
  }
  return { path: `/app/emails/${e.id}`, query: carryFolder }
}

function openRow(e: Email) {
  // Drafts open in the floating composer instead of a read view.
  if (e.status === 'draft' && folder.value === 'drafts') {
    openCompose({ draftId: e.id })
    return
  }
  if (e.direction === 'inbound' && !e.read) {
    e.read = true
    unread.decrement()
  }
  navigateTo(rowTarget(e))
}

// Per-row star toggle — optimistic.
async function toggleStar(e: Email) {
  const was = !!e.starred
  e.starred = !was
  try {
    await (was ? unstarEmail(e.id) : starEmail(e.id))
  }
  catch {
    e.starred = was
  }
}

// Per-row archive / trash quick actions.
const acting = ref(false)
async function quickAction(e: Email, fn: (id: string) => Promise<void>, fail: string) {
  if (acting.value) return
  acting.value = true
  try {
    await fn(e.id)
    await refresh()
  }
  catch (err) {
    toastError(errMsg(err, fail))
  }
  finally {
    acting.value = false
  }
}

// Trash from the list asks first (per the "confirm every delete" rule).
async function confirmTrash(e: Email) {
  const ok = await confirm({
    title: 'Move to Trash?',
    text: 'This message will be moved to Trash. You can restore it from there.',
    confirmText: 'Move to Trash',
    danger: true,
  })
  if (!ok) return
  await quickAction(e, trashEmail, 'Could not move to Trash')
}

async function confirmRestore(e: Email) {
  const ok = await confirm({
    title: 'Restore this email?',
    text: 'It will be moved back to your inbox.',
    confirmText: 'Restore',
  })
  if (!ok) return
  await quickAction(e, restoreEmail, 'Could not restore')
}

const emptyText = computed<{ title: string, hint: string }>(() => ({
  inbox: { title: 'Your inbox is empty', hint: 'New mail will appear here.' },
  starred: { title: 'No starred messages', hint: 'Star messages to find them quickly later.' },
  sent: { title: 'Nothing sent yet', hint: 'Messages you send show up here.' },
  drafts: { title: 'No drafts', hint: 'Save a draft from the composer.' },
  archive: { title: 'No archived messages', hint: 'Archived messages live here, out of your Inbox.' },
  spam: { title: 'No spam', hint: 'Reported spam lands here.' },
  trash: { title: 'Trash is empty', hint: 'Deleted messages stay here until removed for good.' },
  all: { title: 'No emails yet', hint: 'Compose your first or wait for one to arrive.' },
}[folder.value]))

// Mobile mail-menu (folder sidebar) overlay, mirroring Vristo's mailbox.vue.
const isShowMailMenu = ref(false)

// Short display name + avatar initials for a row (sender or recipient).
function displayName(e: Email): string {
  return recipient(e)
}
function initials(e: Email): string {
  const name = recipient(e).replace(/<.*>/, '').trim()
  const at = name.indexOf('@')
  const base = at > 0 ? name.slice(0, at) : name
  const parts = base.split(/[.\s_-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return (base.slice(0, 2) || '?').toUpperCase()
}
</script>

<template>
    <div>
        <div class="relative flex h-full gap-5 sm:h-[calc(100vh_-_150px)]">
            <!-- Mobile overlay -->
            <div
                class="overlay absolute z-[5] hidden h-full w-full rounded-md bg-black/60"
                :class="{ '!block xl:!hidden': isShowMailMenu }"
                @click="isShowMailMenu = !isShowMailMenu"
            ></div>

            <!-- Folder sidebar -->
            <div
                class="panel dark:gray-50 absolute z-10 hidden h-full w-[250px] max-w-full flex-none space-y-3 overflow-hidden p-4 ltr:rounded-r-none rtl:rounded-l-none xl:relative xl:block xl:h-auto ltr:xl:rounded-r-md rtl:xl:rounded-l-md"
                :class="{ '!block': isShowMailMenu }"
            >
                <div class="flex h-full flex-col pb-2">
                    <div class="pb-5">
                        <button v-if="canCompose" type="button" class="btn btn-primary w-full gap-2" @click="openCompose()">
                            <icon-pencil class="h-4 w-4 shrink-0" /> New Message
                        </button>
                        <div v-else class="rounded-md bg-warning-light px-3 py-2 text-xs text-warning-dark dark:bg-warning/10">
                            You can't send yet.
                            <NuxtLink to="/app/domains" class="font-semibold underline">Verify a domain</NuxtLink>
                            to compose.
                        </div>
                    </div>

                    <div class="relative h-full grow overflow-y-auto ltr:-mr-3.5 ltr:pr-3.5 rtl:-ml-3.5 rtl:pl-3.5">
                        <div class="space-y-1">
                            <button
                                v-for="f in folders"
                                :key="f.key"
                                type="button"
                                class="flex h-10 w-full items-center justify-between rounded-md p-2 font-medium hover:bg-white-dark/10 hover:text-primary dark:hover:bg-[#181F32] dark:hover:text-primary"
                                :class="{ 'bg-gray-100 text-primary dark:bg-[#181F32] dark:text-primary': folder === f.key }"
                                @click="selectFolder(f.key); isShowMailMenu = false"
                            >
                                <div class="flex items-center">
                                    <component :is="f.icon" class="h-5 w-5 shrink-0" />
                                    <div class="ltr:ml-3 rtl:mr-3">{{ f.label }}</div>
                                </div>
                                <div
                                    v-if="f.key === 'inbox' && unread.count.value > 0"
                                    class="whitespace-nowrap rounded-md bg-primary-light px-2 py-0.5 font-semibold dark:bg-[#060818]"
                                >
                                    {{ unread.count.value }}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- List pane -->
            <div class="panel h-full flex-1 overflow-x-hidden p-0">
                <div class="flex h-full flex-col">
                    <!-- Toolbar -->
                    <div class="flex flex-wrap-reverse items-center justify-between gap-4 p-4">
                        <div class="flex w-full items-center sm:w-auto">
                            <button
                                type="button"
                                class="flex items-center hover:text-primary ltr:mr-4 rtl:ml-4"
                                title="Refresh"
                                @click="refresh()"
                            >
                                <icon-refresh />
                            </button>
                            <div class="flex items-center gap-2">
                                <component :is="folderMeta.icon" class="h-5 w-5 text-primary" />
                                <h4 class="text-base font-medium md:text-lg">{{ folderMeta.label }}</h4>
                                <span v-if="data?.meta" class="text-sm text-white-dark">({{ data.meta.total }})</span>
                            </div>
                        </div>
                        <div class="flex w-full items-center justify-between sm:w-auto">
                            <div class="flex items-center ltr:mr-4 rtl:ml-4">
                                <button type="button" class="block hover:text-primary ltr:mr-3 rtl:ml-3 xl:hidden" @click="isShowMailMenu = !isShowMailMenu">
                                    <icon-menu />
                                </button>
                                <div class="group relative">
                                    <input
                                        v-model="search"
                                        type="text"
                                        placeholder="Search Mail"
                                        class="peer form-input ltr:pr-8 rtl:pl-8"
                                    />
                                    <div class="absolute top-1/2 -translate-y-1/2 peer-focus:text-primary ltr:right-[11px] rtl:left-[11px]">
                                        <icon-search />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="h-px border-b border-[#e0e6ed] dark:border-[#1b2e4b]"></div>

                    <!-- Pagination header -->
                    <div v-if="data && data.meta" class="flex flex-col flex-wrap items-center justify-end px-4 py-3 md:flex-row xl:w-auto">
                        <div class="flex items-center justify-center md:justify-end">
                            <div class="ltr:mr-3 rtl:ml-3">
                                {{ data.meta.total ? (data.meta.page - 1) * data.meta.per_page + 1 : 0 }}-{{ Math.min(data.meta.page * data.meta.per_page, data.meta.total) }} of {{ data.meta.total }}
                            </div>
                            <button
                                type="button"
                                :disabled="page <= 1"
                                class="rounded-md bg-[#f4f4f4] p-1 enabled:hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 ltr:mr-3 rtl:ml-3 dark:bg-white-dark/20 enabled:dark:hover:bg-white-dark/30"
                                @click="setPage(page - 1)"
                            >
                                <icon-caret-down class="h-5 w-5 rotate-90 rtl:-rotate-90" />
                            </button>
                            <button
                                type="button"
                                :disabled="page >= (data.meta.pages || 1)"
                                class="rounded-md bg-[#f4f4f4] p-1 enabled:hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white-dark/20 enabled:dark:hover:bg-white-dark/30"
                                @click="setPage(page + 1)"
                            >
                                <icon-caret-down class="h-5 w-5 -rotate-90 rtl:rotate-90" />
                            </button>
                        </div>
                    </div>
                    <div class="h-px border-b border-[#e0e6ed] dark:border-[#1b2e4b]"></div>

                    <!-- Error -->
                    <div v-if="error" class="m-4 rounded border border-danger bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
                        {{ errMsg(error, 'Could not load emails') }}
                    </div>

                    <!-- Loading -->
                    <div v-else-if="pending && !data" class="min-h-[300px] grow space-y-3 p-6">
                        <div v-for="n in 6" :key="n" class="h-12 animate-pulse rounded bg-white-light dark:bg-[#1b2e4b]"></div>
                    </div>

                    <!-- Rows -->
                    <template v-else-if="data?.items?.length">
                        <div class="table-responsive min-h-[300px] grow overflow-y-auto">
                            <table>
                                <tbody>
                                    <tr
                                        v-for="e in data.items"
                                        :key="e.id"
                                        class="cursor-pointer"
                                        @click="openRow(e)"
                                    >
                                        <td>
                                            <div class="flex items-center whitespace-nowrap">
                                                <!-- Star -->
                                                <div class="ltr:mr-3 rtl:ml-3">
                                                    <button
                                                        type="button"
                                                        class="flex items-center enabled:hover:text-warning disabled:opacity-60"
                                                        :class="{ 'text-warning': e.starred }"
                                                        :aria-label="e.starred ? 'Unstar' : 'Star'"
                                                        @click.stop="toggleStar(e)"
                                                    >
                                                        <icon-star :class="{ 'fill-warning': e.starred }" />
                                                    </button>
                                                </div>
                                                <!-- Avatar -->
                                                <div class="ltr:mr-3 rtl:ml-3 grid h-9 w-9 shrink-0 place-content-center rounded-full bg-primary-light text-xs font-semibold uppercase text-primary dark:bg-[#060818]">
                                                    {{ initials(e) }}
                                                </div>
                                                <!-- Sender / recipient -->
                                                <div
                                                    class="whitespace-nowrap font-semibold dark:text-gray-300"
                                                    :class="{ 'font-normal text-gray-500 dark:!text-gray-500': !(!e.read && e.direction === 'inbound') }"
                                                >
                                                    {{ displayName(e) }}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="line-clamp-1 min-w-[300px] overflow-hidden font-medium text-white-dark">
                                                <span :class="{ 'font-semibold text-gray-800 dark:text-gray-300': !e.read && e.direction === 'inbound' }">
                                                    <span>{{ e.subject || '(no subject)' }}</span>
                                                    <template v-if="preview(e)"> &minus; <span>{{ preview(e) }}</span></template>
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="flex items-center gap-3">
                                                <orb-email-status-pill
                                                    v-if="!['sent', 'delivered', 'received'].includes(e.status)"
                                                    :status="e.status"
                                                    class="shrink-0"
                                                />
                                                <icon-paperclip v-if="e.has_attachments" class="shrink-0 text-white-dark" />
                                            </div>
                                        </td>
                                        <td class="whitespace-nowrap font-medium ltr:text-right rtl:text-left">
                                            <div class="flex items-center justify-end gap-1">
                                                <!-- Quick actions (hover) -->
                                                <div class="hidden items-center gap-1 opacity-0 transition-opacity sm:flex" @click.stop>
                                                    <button
                                                        v-if="!['archive', 'trash', 'spam'].includes(folder)"
                                                        type="button"
                                                        class="rounded p-1 text-white-dark hover:text-primary"
                                                        title="Archive"
                                                        :disabled="acting"
                                                        @click="quickAction(e, archiveEmail, 'Could not archive')"
                                                    >
                                                        <icon-archive class="h-4.5 w-4.5" />
                                                    </button>
                                                    <button
                                                        v-if="folder === 'trash'"
                                                        type="button"
                                                        class="rounded p-1 text-white-dark hover:text-success"
                                                        title="Restore"
                                                        :disabled="acting"
                                                        @click="confirmRestore(e)"
                                                    >
                                                        <icon-restore class="h-4.5 w-4.5" />
                                                    </button>
                                                    <button
                                                        v-else
                                                        type="button"
                                                        class="rounded p-1 text-white-dark hover:text-danger"
                                                        title="Move to Trash"
                                                        :disabled="acting"
                                                        @click="confirmTrash(e)"
                                                    >
                                                        <icon-trash-lines class="h-4.5 w-4.5" />
                                                    </button>
                                                </div>
                                                <span class="text-white-dark">{{ fmtListDate(e.created_at) }}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>

                    <!-- Empty -->
                    <template v-else>
                        <div class="grid h-full min-h-[300px] grow place-content-center px-4 text-center">
                            <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
                                <icon-inbox class="h-6 w-6" />
                            </div>
                            <div class="text-lg font-semibold">{{ emptyText.title }}</div>
                            <div class="mt-1 text-sm text-white-dark">{{ search ? 'No matches for this search.' : emptyText.hint }}</div>
                        </div>
                    </template>

                    <!-- Pagination footer -->
                    <template v-if="data && (data.meta?.pages || 1) > 1">
                        <div class="h-px border-b border-[#e0e6ed] dark:border-[#1b2e4b]"></div>
                        <div class="flex items-center justify-between gap-2 p-4">
                            <span class="text-xs text-white-dark">
                                {{ (data.meta.page - 1) * data.meta.per_page + 1 }}-{{ Math.min(data.meta.page * data.meta.per_page, data.meta.total) }}
                                of {{ data.meta.total }}
                            </span>
                            <div class="flex items-center gap-1">
                                <button type="button" class="btn btn-sm btn-outline-primary" :disabled="page <= 1" @click="setPage(page - 1)">Prev</button>
                                <template v-for="(p, i) in pageNumbers" :key="i">
                                    <span v-if="p === '…'" class="px-1 text-xs text-white-dark">…</span>
                                    <button
                                        v-else
                                        type="button"
                                        class="btn btn-sm"
                                        :class="p === page ? 'btn-primary' : 'btn-outline-primary'"
                                        @click="setPage(p)"
                                    >
                                        {{ p }}
                                    </button>
                                </template>
                                <button type="button" class="btn btn-sm btn-outline-primary" :disabled="page >= data.meta.pages" @click="setPage(page + 1)">Next</button>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>
