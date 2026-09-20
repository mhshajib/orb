import { deleteToken, getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging'
import { getApp, getApps, initializeApp } from 'firebase/app'

/**
 * Browser push for inbound mail, via Firebase Cloud Messaging.
 *
 * This is the *closed tab* half of realtime. An open dashboard already gets
 * `new_email` over the websocket (see useRealtime) and updates its list in
 * place; FCM covers the case where the tab is hidden, closed, or the machine
 * is asleep, by handing the message to public/firebase-messaging-sw.js which
 * raises an OS notification.
 *
 * Deliberately no `getAnalytics()`: it isn't used, and it breaks under SSR.
 *
 * State lives at module scope so every component shares one subscription — the
 * composable can be called from the layout and from the settings page without
 * registering the token twice.
 */

export type PushStatus =
  /** No service worker / Notification API, or a browser FCM doesn't support. */
  | 'unsupported'
  /** Server has no Firebase credentials, or no VAPID key is configured. */
  | 'unconfigured'
  /** Supported and available, but the user hasn't been asked yet. */
  | 'off'
  /** Permission granted and a token is registered with the API. */
  | 'on'
  /** The user blocked notifications — only they can undo this, in site settings. */
  | 'blocked'
  /** A request is in flight. */
  | 'pending'

interface PushState {
  status: PushStatus
  token: string | null
  messaging: Messaging | null
  /** Set once the foreground listener is attached, so we attach it only once. */
  listening: boolean
}

const state = reactive<PushState>({
  status: 'off',
  token: null,
  messaging: null,
  listening: false,
})

function firebaseConfig() {
  return useRuntimeConfig().public.firebase as {
    apiKey: string
    authDomain: string
    projectId: string
    storageBucket: string
    messagingSenderId: string
    appId: string
    vapidKey: string
  }
}

/** Lazily boots the Firebase app. Safe to call repeatedly. */
function app() {
  const cfg = firebaseConfig()
  return getApps().length ? getApp() : initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  })
}

/**
 * Registers our own service worker path rather than letting getToken() look
 * for the default /firebase-messaging-sw.js at the origin root — it happens to
 * live there anyway, but naming it explicitly means a future move of the file
 * doesn't silently turn push off.
 */
async function swRegistration(): Promise<ServiceWorkerRegistration> {
  return await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
}

async function messaging(): Promise<Messaging | null> {
  if (state.messaging) return state.messaging
  if (!(await isSupported())) return null
  state.messaging = getMessaging(app())
  return state.messaging
}

/**
 * Foreground messages are intentionally ignored. When the tab is visible the
 * websocket has already delivered the same email and the inbox has updated —
 * raising a toast here would be a second announcement of one event. The
 * listener exists only so the SDK doesn't log "no handler registered".
 */
function attachForegroundListener(m: Messaging) {
  if (state.listening) return
  state.listening = true
  onMessage(m, () => {})
}

async function serverEnabled(): Promise<boolean> {
  try {
    const res = await $fetch<{ data: { enabled: boolean } }>('/api/push/status')
    return res.data.enabled
  }
  catch {
    return false
  }
}

async function registerToken(token: string) {
  await $fetch('/api/push/tokens', { method: 'POST', body: { token } })
  state.token = token
  state.status = 'on'
}

export function usePushNotifications() {
  /**
   * Called on dashboard boot. Never prompts: it only re-registers a token the
   * user has already consented to, because FCM tokens rotate and a stale one
   * silently stops receiving. If permission was never granted this just
   * settles `status` so the UI can offer the toggle.
   */
  async function init() {
    if (import.meta.server) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      state.status = 'unsupported'
      return
    }
    if (Notification.permission === 'denied') {
      state.status = 'blocked'
      return
    }
    if (!firebaseConfig().vapidKey || !(await serverEnabled())) {
      state.status = 'unconfigured'
      return
    }
    if (Notification.permission !== 'granted') {
      state.status = 'off'
      return
    }
    // Already granted — refresh the registration quietly.
    try {
      const m = await messaging()
      if (!m) {
        state.status = 'unsupported'
        return
      }
      attachForegroundListener(m)
      const token = await getToken(m, {
        vapidKey: firebaseConfig().vapidKey,
        serviceWorkerRegistration: await swRegistration(),
      })
      if (token) await registerToken(token)
    }
    catch (err) {
      // Push is an enhancement; never let it break the dashboard boot.
      console.error('[push] init failed', err)
      state.status = 'off'
    }
  }

  /**
   * Turns notifications on. MUST be called from a user gesture — Chrome and
   * Safari reject a permission prompt that isn't tied to a click.
   *
   * Returns true when a token was registered.
   */
  async function enable(): Promise<boolean> {
    if (import.meta.server) return false
    state.status = 'pending'
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        state.status = 'blocked'
        return false
      }
      if (permission !== 'granted') {
        state.status = 'off'
        return false
      }
      const m = await messaging()
      if (!m) {
        state.status = 'unsupported'
        return false
      }
      attachForegroundListener(m)
      const token = await getToken(m, {
        vapidKey: firebaseConfig().vapidKey,
        serviceWorkerRegistration: await swRegistration(),
      })
      if (!token) {
        state.status = 'off'
        return false
      }
      await registerToken(token)
      return true
    }
    catch (err) {
      console.error('[push] enable failed', err)
      state.status = 'off'
      return false
    }
  }

  /**
   * Turns notifications off for this browser: drops the token server-side so
   * we stop sending, then deletes it locally so FCM stops minting pushes for
   * it. Browser permission itself is left alone — only the user can revoke
   * that, and re-enabling shouldn't need a second prompt.
   */
  async function disable() {
    if (import.meta.server) return
    const token = state.token
    state.status = 'pending'
    try {
      if (token) {
        await $fetch('/api/push/tokens', { method: 'DELETE', body: { token } })
      }
      const m = await messaging()
      if (m) await deleteToken(m)
    }
    catch (err) {
      console.error('[push] disable failed', err)
    }
    finally {
      state.token = null
      state.status = 'off'
    }
  }

  /**
   * Drops this browser's registration on logout, so the next person to use the
   * machine isn't notified about the previous user's mail. Best-effort and
   * synchronous-ish: logout shouldn't wait on it.
   */
  async function forget() {
    if (import.meta.server || !state.token) return
    await disable()
  }

  return {
    status: computed(() => state.status),
    /** True when the dashboard should show an "enable notifications" control. */
    canEnable: computed(() => state.status === 'off'),
    isOn: computed(() => state.status === 'on'),
    init,
    enable,
    disable,
    forget,
  }
}
