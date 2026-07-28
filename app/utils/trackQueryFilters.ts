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

interface SoundsFilterQuery<T> {
  in: (column: string, values: readonly unknown[]) => T
  gte: (column: string, value: number) => T
  lte: (column: string, value: number) => T
  overlaps: (column: string, values: readonly unknown[]) => T
}

export function applyMusicFiltersToSoundsQuery<T extends SoundsFilterQuery<T>>(
  query: T,
  filters: MusicFilterSortParams['filters'] = {}
): T {
  let next = query
  if (filters?.genre?.length) {
    next = next.in('genre', filters.genre)
  }
  if (filters?.bpm?.min != null) {
    next = next.gte('bpm', filters.bpm.min)
  }
  if (filters?.bpm?.max != null) {
    next = next.lte('bpm', filters.bpm.max)
  }
  if (filters?.key?.length) {
    next = next.in('key', filters.key)
  }
  if (filters?.mood?.length) {
    next = next.overlaps('mood', filters.mood)
  }
  if (filters?.year?.min != null) {
    next = next.gte('year', filters.year.min)
  }
  if (filters?.year?.max != null) {
    next = next.lte('year', filters.year.max)
  }
  if (filters?.status?.length) {
    next = next.in('status_id', filters.status)
  }
  return next
}
