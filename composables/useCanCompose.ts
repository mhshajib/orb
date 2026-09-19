/**
 * Sending rules:
 *  - FREE orgs always get a shared sender "<org-slug>@<sharedSendingDomain>",
 *    so they can send the moment they verify their email — no domain setup.
 *  - PAID orgs that verify a custom domain additionally get their own
 *    account-email sender (the backend rewrites the owner's address to
 *    owner@<their-domain> on first verify).
 *
 * The allowed addresses come from GET /api/emails/senders rather than being
 * derived here from the org's sending-domain list. That list is owner/admin
 * only — a member has no business reading the org's DNS setup just to learn
 * their own address — and the rule was the backend's anyway: SendEmail
 * enforces exactly these two cases, so the browser was reimplementing it.
 */
export function useCanCompose() {
  const org = useOrg()
  const senders = useState<string[] | null>('compose.senders', () => null)
  const { sharedDomain } = useMailConfig()

  async function ensureComposeData() {
    if (senders.value !== null) return
    const fetcher = import.meta.server ? useRequestFetch() : $fetch
    try {
      const res = await fetcher<{ data: { senders: string[] } }>('/api/emails/senders')
      senders.value = res.data?.senders ?? []
    }
    catch {
      senders.value = []
    }
  }

  // The shared free-tier sender, derived from the org slug.
  const sharedSender = computed(() => (org.value?.slug ? `${org.value.slug}@${sharedDomain.value}` : ''))

  const senderOptions = computed<string[]>(() => {
    // Callers fire ensureComposeData() without awaiting it, so until the server
    // answers we assume the shared sender, which every org may send as. Without
    // this the Compose button blinks out of existence on every page load.
    if (senders.value === null)
      return sharedSender.value ? [sharedSender.value] : []
    return senders.value
  })

  const senderEmail = computed(() => senderOptions.value[0] ?? sharedSender.value)
  const canCompose = computed(() => senderOptions.value.length > 0)

  return { canCompose, ensureComposeData, senderEmail, senderOptions, sharedSender }
}
