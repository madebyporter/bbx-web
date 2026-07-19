import type { Ref } from 'vue'

export type FilterSortContext = 'software' | 'kits' | 'music'

export interface FilterSortParams {
  sort: {
    sortBy: string
    sortDirection: 'asc' | 'desc'
  }
  filters: {
    price: { free: boolean; paid: boolean }
    os: string[]
    tags: string[]
    genre: string[]
    bpm: { min: number | null; max: number | null }
    key: string[]
    mood: string[]
    year: { min: number | null; max: number | null }
    status: (number | null)[]
    latestVersionOnly: boolean
  }
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function getDefaultFilterSortParams(): FilterSortParams {
  return {
    sort: {
      sortBy: 'created_at',
      sortDirection: 'desc',
    },
    filters: {
      price: { free: false, paid: false },
      os: [],
      tags: [],
      genre: [],
      bpm: { min: null, max: null },
      key: [],
      mood: [],
      year: { min: null, max: null },
      status: [],
      latestVersionOnly: false,
    },
  }
}

export function useFilterSortCookie(context: FilterSortContext) {
  return useCookie<FilterSortParams | null>(`bbx_filterSort_${context}`, {
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    default: () => null,
  })
}

export function migrateFilterSortFromLocalStorage(
  context: FilterSortContext,
  cookie: Ref<FilterSortParams | null>
) {
  if (typeof window === 'undefined') return

  const legacyKey = `filterSort_${context}`
  const legacy = localStorage.getItem(legacyKey)
  if (!legacy) return

  try {
    const parsed = JSON.parse(legacy) as FilterSortParams
    if (!cookie.value && parsed) {
      cookie.value = parsed
    }
    localStorage.removeItem(legacyKey)
  } catch {
    localStorage.removeItem(legacyKey)
  }
}

export function hasActiveFilterSort(
  params: FilterSortParams | null | undefined,
  context: FilterSortContext
): boolean {
  if (!params) return false

  const { sort, filters } = params
  const nonDefaultSort = sort.sortBy !== 'created_at' || sort.sortDirection !== 'desc'

  if (context === 'music') {
    return nonDefaultSort || !!(
      filters.latestVersionOnly ||
      filters.genre?.length > 0 ||
      filters.bpm?.min != null ||
      filters.bpm?.max != null ||
      filters.key?.length > 0 ||
      filters.mood?.length > 0 ||
      filters.year?.min != null ||
      filters.year?.max != null ||
      filters.status?.length > 0
    )
  }

  return nonDefaultSort || !!(
    filters.price?.free ||
    filters.price?.paid ||
    filters.os?.length > 0 ||
    filters.tags?.length > 0
  )
}
