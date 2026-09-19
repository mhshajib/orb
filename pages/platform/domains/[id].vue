<script lang="ts" setup>
import type { DNSRecord } from '@/composables/useDomains'

definePageMeta({ layout: 'platform' })

const { success: toastSuccess, error: toastError, info: toastInfo, confirm } = useToast()
const { getDomain, verifyDomain, deleteDomain } = usePlatformDomains()

const route = useRoute()
const id = computed(() => String(route.params.id))

const { data: domain, pending, error, refresh } = await useAsyncData(
  'pf-domain',
  () => getDomain(id.value),
  { watch: [id] },
)

useHead(() => ({ title: domain.value ? `${domain.value.domain} — Domain` : 'Domain' }))

const verifying = ref(false)
const deleting = ref(false)

async function onVerify() {
  if (verifying.value) return
  verifying.value = true
  try {
    const updated = await verifyDomain(id.value)
    await refresh()
    if (updated.status === 'verified') toastSuccess('Domain verified.')
    else toastInfo(`Verification check ran — status still ${updated.status}.`)
  }
  catch (e) {
    toastError(errMsg(e, 'Verification check failed'))
  }
  finally {
    verifying.value = false
  }
}

async function onDelete() {
  if (deleting.value || !domain.value) return
  const ok = await confirm({
    title: 'Delete this domain?',
    text: `Emails currently in flight may still complete, but you won't be able to send from ${domain.value.domain} after this.`,
    confirmText: 'Delete domain',
    danger: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await deleteDomain(id.value)
    toastSuccess('Domain deleted.')
    await navigateTo('/platform/domains')
  }
  catch (e) {
    toastError(errMsg(e, 'Could not delete domain'))
    deleting.value = false
  }
}

function statusBadgeClass(status: string) {
  if (status === 'verified') return 'badge bg-success'
  if (status === 'failed') return 'badge bg-danger'
  return 'badge bg-warning'
}

// Visually group DNS records by purpose. Heuristics:
//   - DMARC: our synthesized row carries `status === "optional"` AND the
//     `_dmarc` host.
//   - Receiving: Resend's inbound MX always points to inbound-smtp.*.
//   - Sending: everything else (DKIM TXT, SPF TXT, SES feedback MX).
interface GroupedRecords {
  sending: DNSRecord[]
  receiving: DNSRecord[]
  dmarc: DNSRecord[]
}

const grouped = computed<GroupedRecords>(() => {
  const out: GroupedRecords = { sending: [], receiving: [], dmarc: [] }
  if (!domain.value?.dns_records) return out
  for (const r of domain.value.dns_records) {
    if (r.status === 'optional' || r.name === '_dmarc') out.dmarc.push(r)
    else if (r.value?.includes('inbound-smtp')) out.receiving.push(r)
    else out.sending.push(r)
  }
  return out
})

const recordSections = computed(() => [
  { label: 'For sending', records: grouped.value.sending },
  { label: 'For receiving', records: grouped.value.receiving },
  { label: 'DMARC (optional)', records: grouped.value.dmarc },
].filter(s => s.records.length))

function fmtPriority(p: number, type: string) {
  return type === 'MX' ? String(p) : '—'
}
</script>

<template>
  <div class="space-y-5">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-3">
      <NuxtLink to="/platform/domains" class="btn btn-outline-primary btn-sm gap-1">
        <icon-arrow-left class="h-4 w-4" />
        Back
      </NuxtLink>
      <h1 class="text-2xl font-bold text-dark dark:text-white-light">{{ domain?.domain || 'Domain' }}</h1>
    </div>

    <!-- Load error -->
    <div v-if="error" class="panel border border-danger/40 text-sm text-danger">
      {{ errMsg(error, 'Could not load domain') }}
    </div>

    <!-- Loading -->
    <div v-else-if="pending && !domain" class="panel">
      <div class="space-y-3">
        <div class="h-7 w-64 animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
        <div class="h-32 w-full animate-pulse rounded bg-white-light dark:bg-dark/40"></div>
      </div>
    </div>

    <template v-else-if="domain">
      <!-- Header panel -->
      <div class="panel">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <div class="grid h-14 w-14 shrink-0 place-content-center rounded-xl bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
              <icon-globe class="h-7 w-7" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-2xl font-semibold dark:text-white-light">{{ domain.domain }}</h2>
                <span :class="statusBadgeClass(domain.status)" class="capitalize">{{ domain.status }}</span>
              </div>
              <p class="mt-1 flex items-center gap-1.5 text-sm text-white-dark">
                <icon-map-pin class="h-4 w-4" /> Region {{ domain.region || '—' }}
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-outline-primary gap-2" :disabled="verifying" @click="onVerify">
              <icon-refresh class="h-4 w-4" :class="verifying ? 'animate-spin' : ''" />
              {{ verifying ? 'Checking…' : 'Verify' }}
            </button>
            <button type="button" class="btn btn-danger gap-2" :disabled="deleting" @click="onDelete">
              <icon-trash class="h-4 w-4" />
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>

        <!-- Stat row -->
        <div class="mt-5 grid grid-cols-2 gap-4 border-t border-white-light pt-5 dark:border-[#1b2e4b] sm:grid-cols-3">
          <div class="rounded-lg bg-primary/10 p-4">
            <div class="text-xs font-semibold uppercase tracking-wider text-white-dark">Status</div>
            <div class="mt-1 text-lg font-bold capitalize text-primary">{{ domain.status }}</div>
          </div>
          <div class="rounded-lg bg-success/10 p-4">
            <div class="text-xs font-semibold uppercase tracking-wider text-white-dark">Sent</div>
            <div class="mt-1 text-lg font-bold tabular-nums text-success">{{ domain.sent_count }}</div>
          </div>
          <div class="rounded-lg bg-info/10 p-4">
            <div class="text-xs font-semibold uppercase tracking-wider text-white-dark">Received</div>
            <div class="mt-1 text-lg font-bold tabular-nums text-info">{{ domain.received_count }}</div>
          </div>
        </div>
      </div>

      <!-- DNS records -->
      <div class="panel">
        <div class="mb-5 flex items-center gap-2">
          <icon-server class="h-5 w-5 text-primary" />
          <h5 class="text-lg font-semibold dark:text-white-light">DNS records</h5>
        </div>
        <div class="mb-5">
          <p class="text-sm text-white-dark">
            Add these records at your DNS provider, then click <span class="font-semibold">Verify</span> above. Verification typically
            completes within a few minutes; some providers can take longer.
            The <code class="font-mono">_dmarc</code> record is optional but recommended for
            better deliverability — skip it if you already have a DMARC policy elsewhere.
          </p>
        </div>

        <div v-if="!domain.dns_records?.length" class="rounded border border-white-light bg-white-light/40 p-4 text-sm text-white-dark dark:border-dark dark:bg-dark/40">
          No DNS records yet. Try clicking Verify to populate them.
        </div>

        <template v-else>
          <div v-for="section in recordSections" :key="section.label" class="mb-6 overflow-hidden rounded-lg border border-white-light last:mb-0 dark:border-[#1b2e4b]">
            <div class="flex items-center gap-2 border-b border-white-light bg-[#fbfbfb] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white-dark dark:border-[#1b2e4b] dark:bg-[#121c2c]">
              <icon-router class="h-4 w-4" /> {{ section.label }}
            </div>
            <div class="table-responsive">
              <table class="table-hover">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Host / Name</th>
                    <th>Value</th>
                    <th class="w-16">TTL</th>
                    <th class="w-16">Priority</th>
                    <th class="w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in section.records" :key="i">
                    <td class="font-mono text-xs">{{ r.type }}</td>
                    <td class="font-mono text-xs">
                      <div class="flex items-center gap-1.5">
                        <span class="max-w-[18ch] truncate" :title="r.name">{{ r.name }}</span>
                        <OrbCopyButton :value="r.name" label="Copy" />
                      </div>
                    </td>
                    <td class="font-mono text-xs">
                      <div class="flex items-center gap-1.5">
                        <span class="max-w-[42ch] truncate" :title="r.value">{{ r.value }}</span>
                        <OrbCopyButton :value="r.value" label="Copy" />
                      </div>
                    </td>
                    <td class="font-mono text-xs">{{ r.ttl || 'Auto' }}</td>
                    <td class="font-mono text-xs">{{ fmtPriority(r.priority, r.type) }}</td>
                    <td>
                      <span v-if="r.status === 'optional'" class="badge badge-outline-warning">Optional</span>
                      <span
                        v-else
                        class="badge capitalize"
                        :class="r.status === 'verified' ? 'badge-outline-success' : r.status === 'failed' ? 'badge-outline-danger' : 'badge-outline-warning'"
                      >
                        {{ r.status?.replace(/_/g, ' ') || '—' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
