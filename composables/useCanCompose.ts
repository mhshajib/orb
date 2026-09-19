/**
 * Sending rules:
 *  - FREE orgs always get a shared sender "<org-slug>@<sharedSendingDomain>",
 *    so they can send the moment they verify their email — no domain setup.
 *  - PAID orgs that verify a custom domain additionally get their own
 *    account-email sender (the backend rewrites the owner's address to
 *    owner@<their-domain> on first verify).
 * The verified-domain list is fetched once and shared.
 */
export function useCanCompose() {
  const { self } = useSelf()
  const org = useOrg()
  const verifiedDomains = useState<string[] | null>('compose.verifiedDomains', () => null)
  const sharedDomain = (useRuntimeConfig().public.sharedSendingDomain as string) || 'send.orb.bd'

  async function ensureComposeData() {
    if (verifiedDomains.value !== null) return
    try {
      const all = await listDomains()
      verifiedDomains.value = (all ?? [])
        .filter(d => d.status === 'verified')
        .map(d => d.domain.toLowerCase())
    }
    catch {
      verifiedDomains.value = []
    }
  }

  // The shared free-tier sender, derived from the org slug.
  const sharedSender = computed(() => (org.value?.slug ? `${org.value.slug}@${sharedDomain}` : ''))

  // All addresses this user may send from: their own verified-domain address
  // (if their account email sits on a verified custom domain) plus the shared
  // sender as a universal fallback.
  const senderOptions = computed<string[]>(() => {
    const opts: string[] = []
    const email = (self.value?.email ?? '').toLowerCase()
    const at = email.indexOf('@')
    const accountDomain = at > 0 ? email.slice(at + 1) : ''
    if (accountDomain && (verifiedDomains.value ?? []).includes(accountDomain)) {
      opts.push(self.value!.email)
    }
    if (sharedSender.value) opts.push(sharedSender.value)
    return [...new Set(opts)]
  })

  const senderEmail = computed(() => senderOptions.value[0] ?? sharedSender.value)
  const canCompose = computed(() => senderOptions.value.length > 0)

  return { canCompose, ensureComposeData, senderEmail, senderOptions, sharedSender }
}
