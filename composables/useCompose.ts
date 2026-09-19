export interface ComposePrefill {
  replyId?: string
  draftId?: string
}

/**
 * Global state for the Gmail-style floating compose window. The window itself
 * lives once in the app layout; anywhere in the app can open it (mailbox
 * "Compose" button, a message's "Reply", a draft row) via openCompose().
 */
export function useCompose() {
  const open = useState('compose.open', () => false)
  const minimized = useState('compose.minimized', () => false)
  const prefill = useState<ComposePrefill>('compose.prefill', () => ({}))
  // Bumped on every open so the window can re-key itself and reset its form.
  const instance = useState('compose.instance', () => 0)

  function openCompose(p: ComposePrefill = {}) {
    prefill.value = p
    minimized.value = false
    open.value = true
    instance.value++
  }
  function closeCompose() {
    open.value = false
  }
  function toggleMinimize() {
    minimized.value = !minimized.value
  }

  return { open, minimized, prefill, instance, openCompose, closeCompose, toggleMinimize }
}
