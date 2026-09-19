/**
 * The API key used to personalise the code samples in the developer portal.
 *
 * Orb hashes keys and shows the plaintext exactly once at creation, so there is
 * no endpoint that can hand one back. The only way a sample can carry a working
 * key is if the developer pastes the one they saved.
 *
 * It is kept in sessionStorage, not a cookie or the server: it is a convenience
 * for rendering snippets, it should die with the tab, and it must never be sent
 * anywhere. "Try it" does not use it at all - that runs through the session on
 * the server side.
 */
const STORAGE_KEY = 'orb.developer.sample_key'

export function useDeveloperKey() {
  const apiKey = useState<string | null>('developer.sample_key', () => null)

  // sessionStorage is unavailable during SSR and can throw in privacy modes, so
  // every access is guarded and a failure just means "no key".
  function load() {
    if (import.meta.server) return
    try {
      apiKey.value = window.sessionStorage.getItem(STORAGE_KEY)
    }
    catch {
      apiKey.value = null
    }
  }

  function setKey(value: string) {
    const trimmed = value.trim()
    apiKey.value = trimmed || null
    if (import.meta.server) return
    try {
      if (trimmed) window.sessionStorage.setItem(STORAGE_KEY, trimmed)
      else window.sessionStorage.removeItem(STORAGE_KEY)
    }
    catch {
      // Not being able to remember it is harmless - the samples still render
      // with whatever is in memory for this page view.
    }
  }

  function clearKey() {
    setKey('')
  }

  onMounted(load)

  /** What the Authorization header line should show. */
  const keyPreview = computed(() => apiKey.value || 'orb_live_xxxxxxxxxxxxxxxx')

  return { apiKey, keyPreview, setKey, clearKey }
}
