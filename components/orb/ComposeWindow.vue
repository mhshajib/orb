<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Email } from '@/composables/useEmails'

const { minimized, prefill, closeCompose, toggleMinimize } = useCompose()
const { success, error: toastError } = useToast()
const { self } = useSelf()
const needsVerify = computed(() => self.value?.status === 'pending_verification')
const { canCompose, senderEmail, ensureComposeData } = useCanCompose()
ensureComposeData()
// "From" is fixed to the user's own sending address — not user-selectable.

// --- Recipient chips --------------------------------------------------------
const toAddrs = ref<string[]>([])
const ccAddrs = ref<string[]>([])
const bccAddrs = ref<string[]>([])
const ccVisible = ref(false)
const bccVisible = ref(false)
const replyToVisible = ref(false)
const replyTo = ref('')
const toBuffer = ref('')
const ccBuffer = ref('')
const bccBuffer = ref('')

function commitChips(list: { value: string[] }, buffer: { value: string }) {
  const parts = buffer.value.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)
  if (parts.length) {
    const next = [...list.value]
    for (const p of parts) if (!next.includes(p)) next.push(p)
    list.value = next
  }
  buffer.value = ''
}
function removeChip(list: { value: string[] }, i: number) {
  list.value = list.value.filter((_, idx) => idx !== i)
}
function onChipKeydown(e: KeyboardEvent, list: { value: string[] }, buffer: { value: string }) {
  if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
    e.preventDefault()
    commitChips(list, buffer)
  }
  else if (e.key === 'Backspace' && !buffer.value && list.value.length) {
    removeChip(list, list.value.length - 1)
  }
}

const subject = ref('')
const body = ref('')
const editorOptions = {
  modules: { toolbar: [[{ header: [1, 2, false] }], ['bold', 'italic', 'underline', 'link'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] },
  placeholder: 'Write your message…',
}
const bodyText = computed(() => body.value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())

// --- Attachments ------------------------------------------------------------
const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const MAX_TOTAL_BYTES = 50 * 1024 * 1024
const totalAttachmentBytes = computed(() => files.value.reduce((s, f) => s + f.size, 0))
const overLimit = computed(() => totalAttachmentBytes.value > MAX_TOTAL_BYTES)
function onAttach() { fileInput.value?.click() }
function onFilesChange(e: Event) {
  const t = e.target as HTMLInputElement
  if (!t.files) return
  files.value.push(...Array.from(t.files))
  t.value = ''
}
function removeFile(i: number) { files.value.splice(i, 1) }
function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 ** 2).toFixed(1)} MB`
}
function escapeHTML(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>')
}
function withSubjectPrefix(s: string) {
  const t = (s ?? '').trim()
  return /^re:/i.test(t) ? t : `Re: ${t}`
}

// --- Prefill (reply / draft) ------------------------------------------------
const draftID = ref('')
const replyParentID = ref('')
const heading = ref('New message')

onMounted(async () => {
  const p = prefill.value
  if (p.draftId) {
    try {
      const d = await getEmail(p.draftId)
      if (d.status === 'draft') {
        draftID.value = d.id
        heading.value = 'Edit draft'
        toAddrs.value = d.to ?? []
        if (d.cc?.length) { ccVisible.value = true; ccAddrs.value = d.cc }
        if (d.bcc?.length) { bccVisible.value = true; bccAddrs.value = d.bcc }
        subject.value = d.subject ?? ''
        body.value = d.html_body || (d.text_body ? `<p>${escapeHTML(d.text_body)}</p>` : '')
      }
    }
    catch (e) { console.warn('draft load failed', e) }
  }
  else if (p.replyId) {
    try {
      const src = await getEmail(p.replyId)
      heading.value = 'Reply'
      replyParentID.value = src.id
      toAddrs.value = (src.direction === 'inbound' ? [src.from] : (src.to ?? [])).filter(Boolean)
      subject.value = withSubjectPrefix(src.subject ?? '')
      const when = new Date(src.created_at).toLocaleString()
      const quoted = (src.text_body || (src.html_body || '').replace(/<[^>]+>/g, ' ')).trim()
      body.value = `<p><br></p><p>On ${when}, ${escapeHTML(src.from)} wrote:</p><blockquote>${escapeHTML(quoted)}</blockquote>`
    }
    catch (e) { console.warn('reply load failed', e) }
  }
})

// --- Send -------------------------------------------------------------------
const submitting = ref(false)
const submitError = ref('')
const uploadProgress = ref(-1)

async function onSend() {
  if (submitting.value) return
  submitError.value = ''
  commitChips(toAddrs, toBuffer)
  if (ccVisible.value) commitChips(ccAddrs, ccBuffer)
  if (bccVisible.value) commitChips(bccAddrs, bccBuffer)

  if (!senderEmail.value) { submitError.value = 'Your account has no sending address.'; return }
  if (toAddrs.value.length === 0) { submitError.value = 'At least one recipient is required.'; return }
  if (!subject.value.trim()) { submitError.value = 'Subject is required.'; return }
  if (!bodyText.value) { submitError.value = 'Add a message body.'; return }
  if (overLimit.value) { submitError.value = 'Attachments exceed the 50 MiB limit.'; return }

  submitting.value = true
  uploadProgress.value = 0
  try {
    const created: Email = await sendEmail(
      {
        from: senderEmail.value,
        to: toAddrs.value,
        cc: ccVisible.value ? ccAddrs.value : undefined,
        bcc: bccVisible.value ? bccAddrs.value : undefined,
        subject: subject.value.trim(),
        html: body.value,
        text: bodyText.value,
        reply_to: replyToVisible.value && replyTo.value.trim() ? replyTo.value.trim() : undefined,
        parent_id: replyParentID.value || undefined,
        attachments: files.value,
      },
      (loaded, total) => { uploadProgress.value = total > 0 ? loaded / total : 0 },
    )
    if (draftID.value) {
      try { await deleteEmailForever(draftID.value) }
      catch (e) { console.warn('draft cleanup failed', e) }
    }
    success('Email sent.')
    closeCompose()
    void created
  }
  catch (e) {
    submitError.value = errMsg(e, 'Send failed')
    uploadProgress.value = -1
  }
  finally {
    submitting.value = false
  }
}

// --- Save draft -------------------------------------------------------------
const savingDraft = ref(false)
async function onSaveDraft() {
  if (savingDraft.value || submitting.value) return
  commitChips(toAddrs, toBuffer)
  if (ccVisible.value) commitChips(ccAddrs, ccBuffer)
  if (bccVisible.value) commitChips(bccAddrs, bccBuffer)
  savingDraft.value = true
  try {
    const payload = {
      from: senderEmail.value,
      to: toAddrs.value,
      cc: ccVisible.value ? ccAddrs.value : undefined,
      bcc: bccVisible.value ? bccAddrs.value : undefined,
      subject: subject.value,
      html: bodyText.value ? body.value : '',
      text: bodyText.value,
      reply_to: replyToVisible.value && replyTo.value.trim() ? replyTo.value.trim() : undefined,
    }
    const saved = draftID.value ? await updateDraft(draftID.value, payload) : await createDraft(payload)
    draftID.value = saved.id
    success('Draft saved.')
  }
  catch (e) {
    toastError(errMsg(e, 'Could not save draft'))
  }
  finally {
    savingDraft.value = false
  }
}
</script>

<template>
    <div
        class="fixed bottom-0 z-[60] w-[720px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-t-lg bg-white shadow-[0_-2px_30px_-5px_rgba(0,0,0,0.35)] ring-1 ring-black/10 ltr:right-6 rtl:left-6 dark:bg-[#0e1726] dark:ring-white/10"
    >
        <!-- Title bar -->
        <div
            class="flex items-center justify-between bg-[#1f2937] px-4 py-2.5 text-white dark:bg-black"
            @click="minimized && toggleMinimize()"
            :class="{ 'cursor-pointer': minimized }"
        >
            <div class="flex items-center gap-2 text-sm font-semibold">
                <icon-pencil class="h-4 w-4" />
                <span class="truncate">{{ heading }}</span>
            </div>
            <div class="flex items-center gap-1">
                <button type="button" class="rounded p-1 hover:bg-white/10" :title="minimized ? 'Expand' : 'Minimize'" @click.stop="toggleMinimize">
                    <icon-minus v-if="!minimized" class="h-4 w-4" />
                    <icon-arrow-left v-else class="h-4 w-4 rotate-90" />
                </button>
                <button type="button" class="rounded p-1 hover:bg-white/10" title="Close" @click.stop="closeCompose">
                    <icon-x class="h-4 w-4" />
                </button>
            </div>
        </div>

        <div v-show="!minimized">
            <!-- Verify-email gate -->
            <div v-if="needsVerify" class="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-warning-light text-warning"><icon-mail class="h-6 w-6" /></div>
                <h4 class="font-semibold">Verify your email first</h4>
                <p class="text-xs text-white-dark">Confirm your email address to start sending. Check your inbox for the link.</p>
                <button type="button" class="btn btn-outline-primary btn-sm" @click="closeCompose">Close</button>
            </div>

            <!-- Can't send gate -->
            <div v-else-if="!canCompose" class="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-warning-light text-warning"><icon-mail class="h-6 w-6" /></div>
                <h4 class="font-semibold">You can't send email yet</h4>
                <p class="text-xs text-white-dark">Sending requires your account email to be on a verified org domain.</p>
                <NuxtLink to="/app/domains" class="btn btn-primary btn-sm" @click="closeCompose">Verify a domain</NuxtLink>
            </div>

            <template v-else>
                <div class="max-h-[72vh] space-y-3 overflow-y-auto px-4 py-3">
                    <!-- From (fixed — your own sending address) -->
                    <div class="flex items-center gap-2 border-b border-[#e0e6ed] pb-2 text-sm dark:border-[#1b2e4b]">
                        <span class="text-white-dark">From</span>
                        <span class="inline-flex items-center gap-1.5 font-medium"><span class="h-1.5 w-1.5 rounded-full bg-success"></span>{{ senderEmail }}</span>
                    </div>

                    <!-- To -->
                    <div class="flex items-start gap-2 border-b border-[#e0e6ed] pb-2 dark:border-[#1b2e4b]">
                        <span class="shrink-0 pt-1.5 text-sm text-white-dark">To</span>
                        <div class="flex flex-1 flex-wrap items-center gap-1.5">
                            <span v-for="(addr, i) in toAddrs" :key="`to-${addr}-${i}`" class="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs dark:bg-[#060818]">
                                {{ addr }}<button type="button" class="hover:text-danger" @click="removeChip(toAddrs, i)"><icon-x class="h-3 w-3" /></button>
                            </span>
                            <input v-model="toBuffer" type="text" :placeholder="toAddrs.length ? '' : 'Recipients'" class="min-w-[10ch] flex-1 bg-transparent py-1 text-sm outline-none" @keydown="onChipKeydown($event, toAddrs, toBuffer)" @blur="commitChips(toAddrs, toBuffer)" />
                        </div>
                        <div class="flex shrink-0 gap-2 pt-1.5 text-xs text-white-dark">
                            <button v-if="!ccVisible" type="button" class="hover:text-primary" @click="ccVisible = true">Cc</button>
                            <button v-if="!bccVisible" type="button" class="hover:text-primary" @click="bccVisible = true">Bcc</button>
                        </div>
                    </div>

                    <!-- Cc -->
                    <div v-if="ccVisible" class="flex items-start gap-2 border-b border-[#e0e6ed] pb-2 dark:border-[#1b2e4b]">
                        <span class="shrink-0 pt-1.5 text-sm text-white-dark">Cc</span>
                        <div class="flex flex-1 flex-wrap items-center gap-1.5">
                            <span v-for="(addr, i) in ccAddrs" :key="`cc-${addr}-${i}`" class="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs dark:bg-[#060818]">
                                {{ addr }}<button type="button" class="hover:text-danger" @click="removeChip(ccAddrs, i)"><icon-x class="h-3 w-3" /></button>
                            </span>
                            <input v-model="ccBuffer" type="text" placeholder="" class="min-w-[10ch] flex-1 bg-transparent py-1 text-sm outline-none" @keydown="onChipKeydown($event, ccAddrs, ccBuffer)" @blur="commitChips(ccAddrs, ccBuffer)" />
                        </div>
                    </div>

                    <!-- Bcc -->
                    <div v-if="bccVisible" class="flex items-start gap-2 border-b border-[#e0e6ed] pb-2 dark:border-[#1b2e4b]">
                        <span class="shrink-0 pt-1.5 text-sm text-white-dark">Bcc</span>
                        <div class="flex flex-1 flex-wrap items-center gap-1.5">
                            <span v-for="(addr, i) in bccAddrs" :key="`bcc-${addr}-${i}`" class="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs dark:bg-[#060818]">
                                {{ addr }}<button type="button" class="hover:text-danger" @click="removeChip(bccAddrs, i)"><icon-x class="h-3 w-3" /></button>
                            </span>
                            <input v-model="bccBuffer" type="text" placeholder="" class="min-w-[10ch] flex-1 bg-transparent py-1 text-sm outline-none" @keydown="onChipKeydown($event, bccAddrs, bccBuffer)" @blur="commitChips(bccAddrs, bccBuffer)" />
                        </div>
                    </div>

                    <!-- Subject -->
                    <div class="border-b border-[#e0e6ed] pb-2 dark:border-[#1b2e4b]">
                        <input v-model="subject" type="text" placeholder="Subject" class="w-full bg-transparent py-1 text-sm font-medium outline-none" />
                    </div>

                    <!-- Reply-to (optional) -->
                    <div v-if="replyToVisible" class="border-b border-[#e0e6ed] pb-2 dark:border-[#1b2e4b]">
                        <input v-model="replyTo" type="email" placeholder="Reply-to address" class="w-full bg-transparent py-1 text-sm outline-none" />
                    </div>

                    <!-- Body -->
                    <client-only>
                        <quillEditor v-model:value="body" :options="editorOptions" style="min-height: 300px" />
                    </client-only>

                    <!-- Attachments -->
                    <div v-if="files.length" class="space-y-1.5">
                        <div class="flex items-center justify-between text-xs text-white-dark">
                            <span>{{ files.length }} attachment{{ files.length === 1 ? '' : 's' }}</span>
                            <span :class="overLimit ? 'font-semibold text-danger' : ''">{{ fmtBytes(totalAttachmentBytes) }} / 50 MiB</span>
                        </div>
                        <div v-for="(f, i) in files" :key="`${f.name}-${i}`" class="flex items-center gap-2 rounded border border-white-light p-1.5 dark:border-[#1b2e4b]">
                            <icon-paperclip class="h-4 w-4 shrink-0 text-white-dark" />
                            <div class="min-w-0 flex-1"><div class="truncate text-xs">{{ f.name }}</div></div>
                            <button type="button" class="shrink-0 text-white-dark hover:text-danger" @click="removeFile(i)"><icon-x class="h-3.5 w-3.5" /></button>
                        </div>
                    </div>

                    <div v-if="submitError" class="rounded border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{{ submitError }}</div>

                    <div v-if="submitting && uploadProgress >= 0" class="space-y-1">
                        <div class="h-1.5 w-full overflow-hidden rounded-full bg-white-light dark:bg-[#1b2e4b]">
                            <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${Math.round(uploadProgress * 100)}%` }"></div>
                        </div>
                        <div class="text-[11px] text-white-dark">{{ uploadProgress >= 1 ? 'Finalizing…' : `Uploading ${Math.round(uploadProgress * 100)}%` }}</div>
                    </div>
                </div>

                <!-- Action bar -->
                <div class="flex items-center justify-between gap-2 border-t border-[#e0e6ed] px-4 py-2.5 dark:border-[#1b2e4b]">
                    <button type="button" class="btn btn-primary gap-1" :disabled="submitting" @click="onSend">
                        <icon-send class="h-4 w-4" /> {{ submitting ? 'Sending…' : 'Send' }}
                    </button>
                    <input ref="fileInput" type="file" multiple class="hidden" @change="onFilesChange" />
                    <div class="flex items-center gap-1">
                        <button type="button" class="rounded p-2 text-white-dark hover:bg-primary/10 hover:text-primary" title="Attach files" @click="onAttach"><icon-paperclip class="h-4.5 w-4.5" /></button>
                        <button type="button" class="rounded p-2 text-white-dark hover:bg-primary/10 hover:text-primary" title="Save draft" :disabled="savingDraft || submitting" @click="onSaveDraft"><icon-save class="h-4.5 w-4.5" /></button>
                        <button type="button" class="rounded p-2 text-white-dark hover:bg-danger/10 hover:text-danger" title="Discard" @click="closeCompose"><icon-trash-lines class="h-4.5 w-4.5" /></button>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
