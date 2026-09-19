<script lang="ts" setup>
import type { ResendRegion } from '@/composables/useDomains'

definePageMeta({ layout: 'platform' })
useHead({ title: 'Orb sending domains' })

const { success: toastSuccess, error: toastError } = useToast()
const { listDomains, addDomain } = usePlatformDomains()

const { data: domains, pending, error, refresh } = await useAsyncData('pf-domains', () => listDomains())

const dialogOpen = ref(false)
const newDomain = ref('')
const newRegion = ref<ResendRegion>('ap-northeast-1')
const submitting = ref(false)
const submitError = ref('')

function openDialog() {
  newDomain.value = ''
  newRegion.value = 'ap-northeast-1'
  submitError.value = ''
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
}

/**
 * Normalize the domain the user typed into a plain hostname.
 * Accepts things like "https://example.com/" and reduces them to "example.com"
 * before sending. Returns an error message instead of throwing so the dialog
 * can show it inline.
 */
function normalizeDomain(raw: string): { domain: string, error?: string } {
  let d = raw.trim().toLowerCase()
  if (!d) return { domain: '', error: 'Enter a domain.' }
  d = d.replace(/^[a-z][a-z0-9+\-.]*:\/\//, '') // strip scheme
  d = d.replace(/^[^/@]*@/, '') // strip user:pass@
  d = d.split(/[/?#]/)[0] ?? '' // strip path / query / fragment
  d = d.split(':')[0] ?? '' // strip port
  d = d.replace(/^www\./, '').replace(/\.$/, '') // strip leading www. and trailing dot
  if (!d) return { domain: '', error: 'Enter a domain.' }
  const valid = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d)
  if (!valid) return { domain: d, error: `"${d}" doesn't look like a valid hostname.` }
  return { domain: d }
}

async function onAdd() {
  if (submitting.value) return
  submitError.value = ''
  const { domain, error: normalizeError } = normalizeDomain(newDomain.value)
  if (normalizeError) {
    submitError.value = normalizeError
    if (domain) newDomain.value = domain
    return
  }
  newDomain.value = domain
  submitting.value = true
  try {
    const created = await addDomain(domain, newRegion.value)
    dialogOpen.value = false
    await refresh()
    toastSuccess('Domain added.')
    await navigateTo(`/platform/domains/${created.id}`)
  }
  catch (e) {
    submitError.value = errMsg(e, 'Could not add domain')
    toastError(submitError.value)
  }
  finally {
    submitting.value = false
  }
}

function statusBadgeClass(status: string) {
  if (status === 'verified') return 'badge bg-success'
  if (status === 'failed') return 'badge bg-danger'
  return 'badge bg-warning'
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-dark dark:text-white-light">Orb sending domains</h1>
        <p class="mt-1 max-w-2xl text-sm text-white-dark">
          Provision and verify Orb's own domains (orb.bd for customer mailboxes + employee mail, send.orb.bd for Orb's own transactional mail).
        </p>
      </div>
      <button type="button" class="btn btn-primary gap-2" @click="openDialog">
        <icon-plus class="h-4 w-4" /> Add domain
      </button>
    </div>

    <!-- Load error -->
    <div v-if="error" class="panel border border-danger/40">
        <div class="flex flex-wrap items-center gap-3">
          <p class="min-w-0 flex-1 break-words text-sm text-danger">{{ errMsg(error, 'Could not load domains') }}</p>
          <button type="button" class="btn btn-outline-danger btn-sm" @click="refresh()">Try again</button>
        </div>
      </div>

    <!-- Loading -->
    <div v-else-if="pending && !domains" class="panel">
      <div class="space-y-3">
        <div class="h-5 w-48 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
        <div class="h-5 w-64 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
        <div class="h-5 w-40 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!domains?.length" class="panel">
      <div class="flex flex-col items-center gap-4 py-14 text-center">
        <div class="grid h-16 w-16 place-content-center rounded-2xl bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
          <icon-globe class="h-7 w-7" />
        </div>
        <div>
          <div class="text-lg font-semibold dark:text-white-light">No domains yet</div>
          <div class="text-sm text-white-dark">Add a domain for Orb's own sending. We'll show you the DNS records to set up.</div>
        </div>
        <button type="button" class="btn btn-primary gap-2" @click="openDialog">
          <icon-plus class="h-4 w-4" /> Add your first domain
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="panel p-0">
      <div class="mb-5 flex items-center justify-between border-b border-white-light px-5 pt-5 pb-4 dark:border-[#1b2e4b]">
        <h5 class="text-lg font-semibold dark:text-white-light">All domains</h5>
        <span class="badge bg-primary/20 text-primary dark:bg-primary dark:text-white">{{ domains.length }} total</span>
      </div>
      <div class="table-responsive">
        <table class="table-hover whitespace-nowrap">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Status</th>
              <th>Region</th>
              <th class="text-right">Sent</th>
              <th class="text-right">Received</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in domains"
              :key="d.id"
              class="group cursor-pointer"
              @click="navigateTo(`/platform/domains/${d.id}`)"
            >
              <td>
                <div class="flex items-center gap-3">
                  <div class="grid h-9 w-9 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
                    <icon-globe class="h-4.5 w-4.5" />
                  </div>
                  <span class="font-semibold text-dark group-hover:text-primary dark:text-white-light">{{ d.domain }}</span>
                </div>
              </td>
              <td>
                <span :class="statusBadgeClass(d.status)" class="capitalize">{{ d.status }}</span>
              </td>
              <td class="text-xs text-white-dark">{{ d.region || '—' }}</td>
              <td class="text-right font-semibold tabular-nums">{{ d.sent_count }}</td>
              <td class="text-right font-semibold tabular-nums">{{ d.received_count }}</td>
              <td class="text-xs text-white-dark">{{ fmtDate(d.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add domain dialog -->
    <div v-if="dialogOpen" class="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[black]/60 px-4 py-8">
      <div class="panel w-full max-w-md overflow-hidden rounded-lg border-0 p-0">
        <div class="flex items-center justify-between bg-[#fbfbfb] py-3 px-5 dark:bg-[#121c2c]">
          <h5 class="text-lg font-bold dark:text-white-light">Add a sending domain</h5>
          <button type="button" class="text-gray-400 outline-none hover:text-gray-800 dark:hover:text-gray-600" @click="closeDialog">
            <icon-x class="h-5 w-5" />
          </button>
        </div>
        <p class="px-5 pt-5 text-sm text-white-dark">We'll set up the domain and show you the DNS records to add.</p>
        <form class="space-y-4 p-5" @submit.prevent="onAdd">
          <div>
            <label for="domain" class="mb-1.5 block font-semibold">Domain</label>
            <input id="domain" v-model="newDomain" type="text" class="form-input" placeholder="send.orb.bd" autocomplete="off" required />
            <p class="mt-1 text-xs text-white-dark">
              Just the hostname — e.g. <code class="font-mono">orb.bd</code> or <code class="font-mono">send.orb.bd</code>. We'll strip <code class="font-mono">https://</code> and trailing slashes if you paste a URL.
            </p>
          </div>
          <div>
            <label for="region" class="mb-1.5 block font-semibold">Sending region</label>
            <select id="region" v-model="newRegion" class="form-select" required>
              <option v-for="r in RESEND_REGIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
            <p class="mt-1 text-xs text-white-dark">
              Closer regions mean lower delivery latency. The region is fixed for the life of the domain — to change it later, delete and re-add.
            </p>
          </div>
          <div v-if="submitError" class="rounded border border-danger/50 bg-danger-light p-3 text-sm text-danger dark:bg-danger/10">
            {{ submitError }}
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-outline-primary" @click="closeDialog">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Adding…' : 'Add domain' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
