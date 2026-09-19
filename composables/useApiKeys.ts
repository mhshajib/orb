export interface ApiKey {
  id: string
  org_id: string
  user_id: string // the backing api_user
  name: string
  key_preview: string // first 13 chars, e.g. "orb_live_abcd"
  created_by_id: string
  last_used_at: string | null
  created_at: string
}

export interface CreateApiKeyResponse {
  /** Plaintext key — shown ONCE, never returned again. */
  key: string
  metadata: ApiKey
}

const fetcher = () => (import.meta.server ? useRequestFetch() : $fetch)

export async function listApiKeys(): Promise<ApiKey[]> {
  const res = await fetcher()<{ data: ApiKey[] }>('/api/keys')
  return res.data ?? []
}

export async function createApiKey(name: string): Promise<CreateApiKeyResponse> {
  const res = await fetcher()<{ data: CreateApiKeyResponse }>('/api/keys', {
    method: 'POST',
    body: { name },
  })
  return res.data
}

export async function revokeApiKey(id: string): Promise<void> {
  await fetcher()(`/api/keys/${id}`, { method: 'DELETE' })
}
