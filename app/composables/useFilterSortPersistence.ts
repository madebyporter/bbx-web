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
const SORT_OPTIONS: Record<FilterSortContext, readonly string[]> = {
  software: ['created_at', 'name', 'creator', 'price'],
  kits: ['created_at', 'name', 'creator', 'price'],
  music: ['created_at', 'title', 'artist', 'bpm', 'year', 'status'],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isStatusArray(value: unknown): value is (number | null)[] {
  return Array.isArray(value) && value.every(
    status => status === null || (typeof status === 'number' && Number.isFinite(status))
  )
}

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

export function parseFilterSortParams(
  value: unknown,
  context: FilterSortContext
): FilterSortParams | null {
  if (!isRecord(value) || !isRecord(value.sort) || !isRecord(value.filters)) {
    return null
  }

  const { sort, filters } = value
  if (
    typeof sort.sortBy !== 'string' ||
    !SORT_OPTIONS[context].includes(sort.sortBy) ||
    (sort.sortDirection !== 'asc' && sort.sortDirection !== 'desc') ||
    !isRecord(filters.price) ||
    typeof filters.price.free !== 'boolean' ||
    typeof filters.price.paid !== 'boolean' ||
    !isStringArray(filters.os) ||
    !isStringArray(filters.tags) ||
    !isStringArray(filters.genre) ||
    !isRecord(filters.bpm) ||
    !isNullableFiniteNumber(filters.bpm.min) ||
    !isNullableFiniteNumber(filters.bpm.max) ||
    !isStringArray(filters.key) ||
    !isStringArray(filters.mood) ||
    !isRecord(filters.year) ||
    !isNullableFiniteNumber(filters.year.min) ||
    !isNullableFiniteNumber(filters.year.max) ||
    !isStatusArray(filters.status) ||
    typeof filters.latestVersionOnly !== 'boolean'
  ) {
    return null
  }

  return {
    sort: {
      sortBy: sort.sortBy,
      sortDirection: sort.sortDirection,
    },
    filters: {
      price: {
        free: filters.price.free,
        paid: filters.price.paid,
      },
      os: [...filters.os],
      tags: [...filters.tags],
      genre: [...filters.genre],
      bpm: {
        min: filters.bpm.min,
        max: filters.bpm.max,
      },
      key: [...filters.key],
      mood: [...filters.mood],
      year: {
        min: filters.year.min,
        max: filters.year.max,
      },
      status: [...filters.status],
      latestVersionOnly: filters.latestVersionOnly,
    },
  }
}

export function useFilterSortCookie(context: FilterSortContext) {
  return useCookie<unknown>(`bbx_filterSort_${context}`, {
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    default: () => null,
  })
}

export function migrateFilterSortFromLocalStorage(
  context: FilterSortContext,
  cookie: Ref<unknown>
) {
  if (typeof window === 'undefined') return

  const legacyKey = `filterSort_${context}`
  const legacy = localStorage.getItem(legacyKey)
  if (!legacy) return

  try {
    const parsed = parseFilterSortParams(JSON.parse(legacy), context)
    if (!cookie.value && parsed) {
      cookie.value = parsed
    }
    localStorage.removeItem(legacyKey)
  } catch {
    localStorage.removeItem(legacyKey)
  }
}

export function hasActiveFilterSort(
  params: unknown,
  context: FilterSortContext
): boolean {
  const parsed = parseFilterSortParams(params, context)
  if (!parsed) return false

  const { sort, filters } = parsed
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
