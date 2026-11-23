import { computed, ref } from 'vue'
import { useSupabase } from '~/utils/supabase'

export type GenreOption = {
  id: number
  name: string
  sort_order: number
}

const genres = ref<GenreOption[]>([])
const loading = ref(false)
const loaded = ref(false)
const error = ref<string | null>(null)
let loadPromise: Promise<void> | null = null

async function fetchGenres(force = false) {
  if (!force && loaded.value && genres.value.length > 0) return
  if (loadPromise && !force) {
    await loadPromise
    return
  }

  const { supabase } = useSupabase()
  if (!supabase) {
    error.value = 'Supabase client unavailable'
    return
  }

  loading.value = true
  error.value = null

  loadPromise = (async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('genres')
        .select('id, name, sort_order')
        .order('sort_order', { ascending: true })

      if (queryError) {
        error.value = queryError.message
        genres.value = []
        loaded.value = false
        return
      }

      genres.value = (data || []).map((row: any) => ({
        id: Number(row.id),
        name: String(row.name),
        sort_order: Number(row.sort_order ?? 0),
      }))
      loaded.value = true
    } finally {
      loading.value = false
      loadPromise = null
    }
  })()

  await loadPromise
}

export function useGenres() {
  const genreNames = computed(() => genres.value.map((g) => g.name))

  const ensureLoaded = async () => {
    await fetchGenres(false)
  }

  const refresh = async () => {
    await fetchGenres(true)
  }

  /** Current value not in PRO list — keep visible until user picks a canonical genre. */
  const orphanGenreOption = (current: string | null | undefined) => {
    const value = (current || '').trim()
    if (!value) return null
    if (genreNames.value.includes(value)) return null
    return value
  }

  return {
    genres,
    genreNames,
    loading,
    loaded,
    error,
    ensureLoaded,
    refresh,
    orphanGenreOption,
  }
}
