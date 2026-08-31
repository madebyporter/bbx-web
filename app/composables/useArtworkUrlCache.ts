import { ref, watch, type Ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useSupabase } from '~/utils/supabase'
import {
  ARTWORK_URL_CACHE_TTL_MS,
  batchFetchArtworkUrls,
  fetchArtworkUrl,
  getArtworkCacheKey,
  getSupabaseArtworkPublicUrl,
  normalizeArtworkProvider,
  type ArtworkEntity,
  type ArtworkKind,
} from '~/utils/artworkStorage'

interface CachedArtworkUrl {
  url: string
  expiry: number
}

const artworkUrlCache = new Map<string, CachedArtworkUrl>()

function getCachedArtworkUrl(cacheKey: string | null): string | null {
  if (!cacheKey) return null
  const cached = artworkUrlCache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached.url
  }
  return null
}

function setCachedArtworkUrl(cacheKey: string | null, url: string | null): void {
  if (!cacheKey || !url) return
  artworkUrlCache.set(cacheKey, {
    url,
    expiry: Date.now() + ARTWORK_URL_CACHE_TTL_MS,
  })
}

export async function resolveArtworkUrl(
  entity: ArtworkEntity,
  kind: ArtworkKind,
  supabase: SupabaseClient | null,
  supabaseUrl?: string,
): Promise<string | null> {
  if (!entity.artwork_path) return null

  const cacheKey = getArtworkCacheKey(entity, kind)
  const cached = getCachedArtworkUrl(cacheKey)
  if (cached) return cached

  if (normalizeArtworkProvider(entity.artwork_provider) === 'supabase') {
    const url = getSupabaseArtworkPublicUrl(entity.artwork_path, supabaseUrl)
    setCachedArtworkUrl(cacheKey, url)
    return url
  }

  const url = await fetchArtworkUrl(entity, kind, supabase, supabaseUrl)
  setCachedArtworkUrl(cacheKey, url)
  return url
}

export async function prefetchArtworkUrls(
  entities: ArtworkEntity[],
  kind: ArtworkKind,
  supabase: SupabaseClient | null,
  supabaseUrl?: string,
): Promise<void> {
  if (!supabase || entities.length === 0) return

  const supabaseEntities = entities.filter(
    (entity) =>
      entity.artwork_path &&
      entity.id &&
      normalizeArtworkProvider(entity.artwork_provider) === 'supabase',
  )

  for (const entity of supabaseEntities) {
    const cacheKey = getArtworkCacheKey(entity, kind)
    const url = getSupabaseArtworkPublicUrl(entity.artwork_path, supabaseUrl)
    setCachedArtworkUrl(cacheKey, url)
  }

  const r2Items = entities
    .filter(
      (entity) =>
        entity.artwork_path &&
        entity.id &&
        normalizeArtworkProvider(entity.artwork_provider) === 'r2',
    )
    .map((entity) => ({ kind, id: entity.id! }))

  if (r2Items.length === 0) return

  const urls = await batchFetchArtworkUrls(r2Items, supabase)
  for (const entity of entities) {
    if (!entity.id || !entity.artwork_path) continue
    const batchKey = `${kind}:${entity.id}`
    const url = urls[batchKey]
    if (url) {
      setCachedArtworkUrl(getArtworkCacheKey(entity, kind), url)
    }
  }
}

export function useResolvedArtworkUrl(
  entity: Ref<ArtworkEntity | null | undefined>,
  kind: ArtworkKind,
) {
  const { supabase } = useSupabase()
  const config = useRuntimeConfig()
  const url = ref<string | null>(null)
  const loading = ref(false)

  const load = async () => {
    const current = entity.value
    if (!current?.artwork_path) {
      url.value = null
      loading.value = false
      return
    }

    loading.value = true
    try {
      url.value = await resolveArtworkUrl(
        current,
        kind,
        supabase,
        config.public.supabaseUrl,
      )
    } finally {
      loading.value = false
    }
  }

  watch(entity, () => {
    void load()
  }, { immediate: true, deep: true })

  return { url, loading }
}

export function invalidateArtworkUrlCache(entity: ArtworkEntity, kind: ArtworkKind): void {
  const cacheKey = getArtworkCacheKey(entity, kind)
  if (cacheKey) {
    artworkUrlCache.delete(cacheKey)
  }
}
