import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { prefetchArtworkUrls } from '~/composables/useArtworkUrlCache'
import { useSupabase } from '~/utils/supabase'
import { normalizeArtworkProvider } from '~/utils/artworkStorage'
import type { StorageProvider } from '~/types/track'

export type ArtworkLibraryItem = {
  path: string
  provider: StorageProvider
  sourceKind: 'track' | 'collection'
  entityId: number
  label: string
}

const items = ref<ArtworkLibraryItem[]>([])
const loading = ref(false)
const loadedForUserId = ref<string | null>(null)
let loadPromise: Promise<void> | null = null

function dedupeByPath(rows: ArtworkLibraryItem[]): ArtworkLibraryItem[] {
  const seen = new Set<string>()
  const out: ArtworkLibraryItem[] = []
  for (const row of rows) {
    if (!row.path || seen.has(row.path)) continue
    seen.add(row.path)
    out.push(row)
  }
  return out
}

export function useArtworkLibrary() {
  const { supabase } = useSupabase()
  const { user } = useAuth()

  const loadArtworkLibrary = async (force = false) => {
    const userId = user.value?.id
    if (!supabase || !userId) {
      items.value = []
      loadedForUserId.value = null
      return
    }

    if (!force && loadedForUserId.value === userId && items.value.length > 0) {
      return
    }

    if (loadPromise && !force) {
      await loadPromise
      return
    }

    loading.value = true
    loadPromise = (async () => {
      try {
        const [{ data: tracks }, { data: collections }] = await Promise.all([
          supabase
            .from('sounds')
            .select('id, title, artwork_path, artwork_provider')
            .eq('user_id', userId)
            .not('artwork_path', 'is', null)
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('collections')
            .select('id, name, artwork_path, artwork_provider')
            .eq('user_id', userId)
            .not('artwork_path', 'is', null)
            .order('created_at', { ascending: false })
            .limit(100),
        ])

        const trackItems: ArtworkLibraryItem[] = (tracks || [])
          .filter((t: any) => t.artwork_path)
          .map((t: any) => ({
            path: String(t.artwork_path),
            provider: normalizeArtworkProvider(t.artwork_provider),
            sourceKind: 'track' as const,
            entityId: Number(t.id),
            label: String(t.title || 'Track'),
          }))

        const collectionItems: ArtworkLibraryItem[] = (collections || [])
          .filter((c: any) => c.artwork_path)
          .map((c: any) => ({
            path: String(c.artwork_path),
            provider: normalizeArtworkProvider(c.artwork_provider),
            sourceKind: 'collection' as const,
            entityId: Number(c.id),
            label: String(c.name || 'Collection'),
          }))

        items.value = dedupeByPath([...trackItems, ...collectionItems])
        loadedForUserId.value = userId

        await Promise.all([
          prefetchArtworkUrls(
            trackItems.map((t) => ({
              id: t.entityId,
              artwork_path: t.path,
              artwork_provider: t.provider,
            })),
            'track',
            supabase,
          ),
          prefetchArtworkUrls(
            collectionItems.map((c) => ({
              id: c.entityId,
              artwork_path: c.path,
              artwork_provider: c.provider,
            })),
            'collection',
            supabase,
          ),
        ])
      } catch (err) {
        console.error('Failed to load artwork library:', err)
        items.value = []
      } finally {
        loading.value = false
        loadPromise = null
      }
    })()

    await loadPromise
  }

  return {
    items,
    loading,
    loadArtworkLibrary,
  }
}
