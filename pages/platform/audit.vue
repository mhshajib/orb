<script setup lang="ts">
import type { AuditLog, ListMeta } from '~/composables/usePlatform'

definePageMeta({ layout: 'platform' })
useHead({ title: 'Audit Log' })

const { listAuditLogs } = usePlatform()

const PER_PAGE = 25
const page = ref(0)
const items = ref<AuditLog[]>([])
const meta = ref<ListMeta | null>(null)
const loading = ref(false)
const error = ref('')

// Client-side filters over the current page.
const actionFilter = ref('')
const actorSearch = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listAuditLogs({ limit: PER_PAGE, offset: page.value * PER_PAGE })
    items.value = res.items
    meta.value = res.meta
  }
  catch (e) {
    error.value = errMsg(e, 'Failed to load audit log')
    items.value = []
  }
  finally {
    loading.value = false
  }
}

watch(page, load)
onMounted(load)

const distinctActions = computed(() =>
  Array.from(new Set(items.value.map(i => i.action))).sort(),
)

const filtered = computed(() => {
  const a = actorSearch.value.trim().toLowerCase()
  return items.value.filter((i) => {
    if (actionFilter.value && i.action !== actionFilter.value)
      return false
    if (a && !i.actor_email?.toLowerCase().includes(a))
      return false
    return true
  })
})

function fmtTime(s: string) {
  return new Date(s).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function payloadSummary(p: Record<string, unknown>): string {
  if (!p || typeof p !== 'object')
    return '—'
  const entries = Object.entries(p)
  if (!entries.length)
    return '—'
  return entries
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(', ')
}

const totalPages = computed(() => meta.value?.pages ?? 1)
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-dark dark:text-white-light">Audit Log</h1>
        <p class="text-sm text-white-dark">Staff actions across the platform.</p>
      </div>
      <button type="button" class="btn btn-outline-primary btn-sm gap-2" :disabled="loading" @click="load">
        <icon-refresh class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </button>
    </div>

    <div class="panel">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <input
            v-model="actorSearch"
            type="text"
            placeholder="Filter by actor email…"
            class="form-input ltr:pl-9 rtl:pr-9"
          >
          <span class="absolute top-1/2 -translate-y-1/2 text-white-dark ltr:left-3 rtl:right-3">
            <icon-search class="h-4 w-4" />
          </span>
        </div>
        <select v-model="actionFilter" class="form-select w-auto">
          <option value="">All actions</option>
          <option v-for="a in distinctActions" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>

      <div v-if="error" class="rounded border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        {{ error }}
      </div>

      <div v-else class="table-responsive">
        <table class="table-hover">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center text-white-dark">Loading…</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="5" class="text-center text-white-dark">No audit entries.</td>
            </tr>
            <tr v-for="(log, i) in filtered" v-else :key="log.id || i">
              <td class="whitespace-nowrap text-white-dark">{{ fmtTime(log.created_at) }}</td>
              <td class="font-semibold text-dark dark:text-white-light">{{ log.actor_email || '—' }}</td>
              <td><span class="badge bg-primary">{{ log.action }}</span></td>
              <td class="text-white-dark">
                <span class="capitalize">{{ log.target_type || '—' }}</span>
                <span v-if="log.target_id" class="block font-mono text-xs opacity-70">{{ log.target_id }}</span>
              </td>
              <td class="max-w-xs truncate text-xs text-white-dark" :title="payloadSummary(log.payload)">
                {{ payloadSummary(log.payload) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="mt-4 flex items-center justify-between">
        <span class="text-xs text-white-dark">
          Page {{ page + 1 }}<template v-if="meta"> of {{ totalPages }} · {{ meta.total }} total</template>
        </span>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :disabled="page === 0 || loading"
            @click="page--"
          >
            Previous
          </button>
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :disabled="loading || (meta ? page + 1 >= totalPages : items.length < PER_PAGE)"
            @click="page++"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
