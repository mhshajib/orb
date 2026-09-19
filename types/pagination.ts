/** Shape of `meta` in every paginated backend list response. */
export interface ListMeta {
  total: number
  page: number
  per_page: number
  pages: number
}
