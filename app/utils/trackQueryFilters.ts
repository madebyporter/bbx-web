export interface MusicFilterSortParams {
  filters?: {
    latestVersionOnly?: boolean
    genre?: string[]
    bpm?: { min?: number | null; max?: number | null }
    key?: string[]
    mood?: string[]
    year?: { min?: number | null; max?: number | null }
    status?: (number | null)[]
  }
  sort?: {
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
  }
}

export function hasActiveMusicFilters(params: MusicFilterSortParams): boolean {
  const f = params.filters || {}
  return !!(
    f.latestVersionOnly ||
    f.genre?.length ||
    f.bpm?.min != null ||
    f.bpm?.max != null ||
    f.key?.length ||
    f.mood?.length ||
    f.year?.min != null ||
    f.year?.max != null ||
    f.status?.length
  )
}

export function hasServerSideMusicFilters(params: MusicFilterSortParams): boolean {
  const f = params.filters || {}
  return !!(
    f.genre?.length ||
    f.bpm?.min != null ||
    f.bpm?.max != null ||
    f.key?.length ||
    f.mood?.length ||
    f.year?.min != null ||
    f.year?.max != null ||
    f.status?.length
  )
}

export function needsClientOnlyPagination(params: MusicFilterSortParams): boolean {
  return !!params.filters?.latestVersionOnly
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyMusicFiltersToSoundsQuery(query: any, filters: MusicFilterSortParams['filters'] = {}) {
  if (filters?.genre?.length) {
    query = query.in('genre', filters.genre)
  }
  if (filters?.bpm?.min != null) {
    query = query.gte('bpm', filters.bpm.min)
  }
  if (filters?.bpm?.max != null) {
    query = query.lte('bpm', filters.bpm.max)
  }
  if (filters?.key?.length) {
    query = query.in('key', filters.key)
  }
  if (filters?.mood?.length) {
    query = query.overlaps('mood', filters.mood)
  }
  if (filters?.year?.min != null) {
    query = query.gte('year', filters.year.min)
  }
  if (filters?.year?.max != null) {
    query = query.lte('year', filters.year.max)
  }
  if (filters?.status?.length) {
    query = query.in('status_id', filters.status)
  }
  return query
}
