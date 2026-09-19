/**
 * The Orb-owned domain customers' own addresses live on, e.g. "orb.bd" in
 * "<org-slug>@orb.bd".
 *
 * Read from the API rather than from runtimeConfig, because Nuxt bakes public
 * runtime config at BUILD time while the API reads its config at boot. The
 * production API config lives in Consul, so editing it there would leave an
 * already-built frontend advertising the old domain — and SendEmail would then
 * reject the From the compose box had just suggested. Fetching it means the UI
 * follows a config change on the next page load, with no rebuild.
 *
 * runtimeConfig stays as the first-paint/offline fallback, in one place instead
 * of the four independent copies this replaced.
 */
export function useMailConfig() {
  const fallback = (useRuntimeConfig().public.sharedSendingDomain as string) || 'orb.bd'
  const state = useState<string | null>('mail.sharedDomain', () => null)

  // useAsyncData dedupes by key, so this is one request per page load however
  // many components ask.
  const { data } = useAsyncData(
    'public-mail-config',
    () => {
      const fetcher = import.meta.server ? useRequestFetch() : $fetch
      return fetcher<{ data: { shared_sending_domain: string } }>('/api/public/mail-config')
    },
    { default: () => null },
  )

  watch(data, (v) => {
    const d = v?.data?.shared_sending_domain
    if (d) state.value = d
  }, { immediate: true })

  const sharedDomain = computed(() => state.value || fallback)
  return { sharedDomain }
}
