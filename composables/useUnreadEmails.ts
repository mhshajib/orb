import { listEmails } from '@/composables/useEmails'

/**
 * App-wide unread-email count, shared across the sidebar badge and the list.
 *
 * Source of truth precedence:
 *   1. WebSocket `unread_count` events ({ count }) — authoritative, set live.
 *   2. Initial `fetchCount()` seed from listEmails({ unread: true }).
 *   3. Optimistic `decrement()` when a row is opened (snappy UI), later
 *      reconciled by (1) if the backend emits an event on read.
 *
 * `useState` keeps the value SSR-safe and singleton across components.
 */
export function useUnreadEmails() {
  const count = useState<number>('unread-emails', () => 0)

  async function fetchCount() {
    try {
      const res = await listEmails({ unread: true, limit: 1 })
      count.value = res.meta?.total ?? 0
    }
    catch {
      // Non-fatal — the badge just stays at its last known value.
    }
  }

  /** Set the authoritative count (from a WS `unread_count` event). */
  function set(n: number) {
    count.value = Math.max(0, n)
  }

  /** Optimistic local decrement when an unread message is opened. */
  function decrement(by = 1) {
    count.value = Math.max(0, count.value - by)
  }

  return { count, fetchCount, set, decrement }
}
