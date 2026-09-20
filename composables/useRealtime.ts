import type { Domain } from '@/composables/useDomains'
import type { Email } from '@/composables/useEmails'

/**
 * Event types broadcast by the backend. Payload shapes per type:
 *
 *   new_email             → full Email object (the email that just arrived)
 *   email_status_update   → { id: string, status: EmailStatus } — when wired by backend
 *   domain_status_update  → full Domain object — fires on user-triggered Verify
 *                           AND on Resend's domain.verified / domain.unverified
 *                           webhooks (zero polling).
 *   stats_update          → org-stats object (total_domains/total_users/total_sent/total_received)
 *   unread_count          → { count: number }
 */
export type RealtimeEventMap = {
  new_email: Email
  email_status_update: { id: string, status: Email['status'] }
  domain_status_update: Domain
  stats_update: { total_domains: number, total_users: number, total_sent: number, total_received: number }
  unread_count: { count: number }
}

type EventType = keyof RealtimeEventMap
type Listener<T extends EventType> = (payload: RealtimeEventMap[T]) => void
type AnyListener = (payload: unknown) => void

interface RealtimeState {
  socket: WebSocket | null
  status: 'idle' | 'connecting' | 'open' | 'closed'
  /** Map<eventType, Set<listener>>. Listeners may be added before connect. */
  listeners: Map<EventType, Set<AnyListener>>
  reconnectAttempt: number
  reconnectTimer: number | null
  /** Set true on explicit disconnect so reconnect loop stops. */
  stopped: boolean
  /** Guards one-time wiring of the wake/online listeners. */
  wired: boolean
}

const state: RealtimeState = {
  socket: null,
  status: 'idle',
  listeners: new Map(),
  reconnectAttempt: 0,
  reconnectTimer: null,
  stopped: true,
  wired: false,
}

const RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000, 30000]

function dispatch(type: EventType, payload: unknown) {
  const set = state.listeners.get(type)
  if (!set) return
  for (const fn of set) {
    try { fn(payload) }
    catch (err) {
      // Keep the bus alive even if a single subscriber throws.
      console.error('[realtime] listener error', type, err)
    }
  }
}

async function mintUrl(): Promise<string> {
  const res = await $fetch<{ data: { url: string } }>('/api/realtime/url')
  return res.data.url
}

function scheduleReconnect() {
  if (state.stopped) return
  const delay = RECONNECT_BACKOFF_MS[Math.min(state.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1)]
  const jitter = Math.floor(Math.random() * 250)
  state.reconnectAttempt++
  if (state.reconnectTimer) window.clearTimeout(state.reconnectTimer)
  state.reconnectTimer = window.setTimeout(() => { void open() }, delay + jitter)
}

async function open() {
  if (state.stopped) return
  if (state.status === 'connecting' || state.status === 'open') return
  state.status = 'connecting'
  let url: string
  try {
    url = await mintUrl()
  }
  catch {
    state.status = 'closed'
    scheduleReconnect()
    return
  }
  if (state.stopped) {
    state.status = 'closed'
    return
  }
  const sock = new WebSocket(url)
  state.socket = sock

  sock.addEventListener('open', () => {
    state.status = 'open'
    state.reconnectAttempt = 0
  })

  sock.addEventListener('message', (ev) => {
    if (typeof ev.data !== 'string') return
    let parsed: { type?: EventType, data?: unknown }
    try { parsed = JSON.parse(ev.data) }
    catch { return }
    if (!parsed?.type) return
    dispatch(parsed.type, parsed.data)
  })

  sock.addEventListener('close', () => {
    state.status = 'closed'
    state.socket = null
    scheduleReconnect()
  })

  sock.addEventListener('error', () => {
    // Browsers fire close after error; let close handle reconnect.
  })
}

/**
 * Reconnects *now* if the socket isn't actually open, instead of waiting out
 * the backoff.
 *
 * Two cases this catches that the close handler alone does not:
 *
 *  - A laptop that slept. The socket is half-open: the OS tore the connection
 *    down without a close frame reaching us, so readyState still says OPEN and
 *    no reconnect was ever scheduled. The dashboard looks connected and
 *    silently receives nothing until the page is reloaded — which is exactly
 *    what "realtime only works after a refresh" looks like from the outside.
 *  - A genuine close that landed mid-backoff. Coming back to the tab after a
 *    drop shouldn't mean waiting up to 30 seconds for the next attempt.
 */
function ensureConnected() {
  if (state.stopped) return
  if (state.socket && state.socket.readyState === WebSocket.OPEN) return

  // Tear down whatever is left so open()'s connecting/open guard can't refuse.
  if (state.socket) {
    try { state.socket.close() } catch {}
    state.socket = null
  }
  if (state.reconnectTimer) {
    window.clearTimeout(state.reconnectTimer)
    state.reconnectTimer = null
  }
  state.status = 'closed'
  state.reconnectAttempt = 0
  void open()
}

/** Wired once per page, not per component that calls the composable. */
function wireWakeListeners() {
  if (state.wired || import.meta.server) return
  state.wired = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ensureConnected()
  })
  window.addEventListener('online', ensureConnected)
  window.addEventListener('focus', ensureConnected)
}

export function useRealtime() {
  /** Start the connection (idempotent). Call from the dashboard shell. */
  function connect() {
    if (import.meta.server) return
    state.stopped = false
    wireWakeListeners()
    void open()
  }

  /** Stop the connection and clear reconnect timers. Call on logout / shell unmount. */
  function disconnect() {
    state.stopped = true
    if (state.reconnectTimer) {
      window.clearTimeout(state.reconnectTimer)
      state.reconnectTimer = null
    }
    if (state.socket) {
      try { state.socket.close() } catch {}
      state.socket = null
    }
    state.status = 'closed'
    state.reconnectAttempt = 0
  }

  /** Subscribe to an event type. Returns an unsubscribe function. */
  function on<T extends EventType>(type: T, fn: Listener<T>): () => void {
    if (!state.listeners.has(type)) state.listeners.set(type, new Set())
    state.listeners.get(type)!.add(fn as AnyListener)
    return () => {
      state.listeners.get(type)?.delete(fn as AnyListener)
    }
  }

  /** Convenience for components: auto-unsubscribe on scope dispose. */
  function useOn<T extends EventType>(type: T, fn: Listener<T>): void {
    if (import.meta.server) return
    const off = on(type, fn)
    onScopeDispose(off)
  }

  return { connect, disconnect, on, useOn, status: () => state.status }
}
