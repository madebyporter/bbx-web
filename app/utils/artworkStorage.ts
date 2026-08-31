import type { SupabaseClient } from '@supabase/supabase-js'
import type { StorageProvider } from '~/types/track'

export type ArtworkKind = 'track' | 'collection'

export interface ArtworkEntity {
  id?: number
  artwork_path?: string | null
  artwork_provider?: StorageProvider | null
}

export interface ArtworkUploadResult {
  artwork_path: string
  artwork_provider: 'r2'
}

export const ARTWORK_BUCKET = 'artwork'
export const ARTWORK_MAX_SIZE = 10 * 1024 * 1024
export const ARTWORK_MAX_DIMENSION = 1600
export const ARTWORK_URL_CACHE_TTL_MS = 23 * 60 * 60 * 1000

export function normalizeArtworkProvider(provider?: string | null): StorageProvider {
  return provider === 'r2' ? 'r2' : 'supabase'
}

export function getArtworkCacheKey(
  entity: ArtworkEntity,
  kind: ArtworkKind,
): string | null {
  if (!entity.artwork_path) return null
  return `${kind}:${entity.id ?? 'unknown'}:${normalizeArtworkProvider(entity.artwork_provider)}:${entity.artwork_path}`
}

export function getSupabaseArtworkPublicUrl(
  path: string | null | undefined,
  supabaseUrl: string | undefined,
): string | null {
  if (!path || !supabaseUrl) return null
  return `${supabaseUrl}/storage/v1/object/public/${ARTWORK_BUCKET}/${path}`
}

async function getAccessToken(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

export async function fetchArtworkUrl(
  entity: ArtworkEntity,
  kind: ArtworkKind,
  supabase: SupabaseClient | null,
  supabaseUrl?: string,
): Promise<string | null> {
  if (!entity.artwork_path) return null

  const provider = normalizeArtworkProvider(entity.artwork_provider)

  if (provider === 'supabase') {
    return getSupabaseArtworkPublicUrl(entity.artwork_path, supabaseUrl)
  }

  if (!supabase || !entity.id) return null

  try {
    const accessToken = await getAccessToken(supabase)
    const body =
      kind === 'track'
        ? { kind, trackId: entity.id }
        : { kind, collectionId: entity.id }

    const response = await $fetch<{ artworkUrl: string }>('/api/storage/presign-artwork-play', {
      method: 'POST',
      body,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })

    return response.artworkUrl
  } catch (error) {
    console.error('Error getting R2 artwork URL:', error)
    return null
  }
}

export async function batchFetchArtworkUrls(
  items: Array<{ kind: ArtworkKind; id: number }>,
  supabase: SupabaseClient | null,
): Promise<Record<string, string | null>> {
  if (!supabase || items.length === 0) return {}

  try {
    const accessToken = await getAccessToken(supabase)
    const response = await $fetch<{ urls: Record<string, string | null> }>(
      '/api/storage/presign-artwork-batch',
      {
        method: 'POST',
        body: { items },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    )
    return response.urls || {}
  } catch (error) {
    console.error('Error batch-fetching artwork URLs:', error)
    return {}
  }
}

export async function uploadArtworkToStorage(
  file: File,
  kind: ArtworkKind,
  supabase: SupabaseClient | null,
  options: { collectionId?: number } = {},
): Promise<ArtworkUploadResult> {
  if (!supabase) {
    throw new Error('Storage is not available')
  }

  const accessToken = await getAccessToken(supabase)
  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  const presign = await $fetch<{
    key: string
    uploadUrl: string
    contentType: string
    artwork_provider: 'r2'
  }>('/api/storage/presign-artwork-upload', {
    method: 'POST',
    body: {
      filename: file.name,
      contentType: file.type || 'image/jpeg',
      kind,
      ...(kind === 'collection' && options.collectionId
        ? { collectionId: options.collectionId }
        : {}),
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': presign.contentType,
    },
  })

  if (!uploadResponse.ok) {
    throw new Error(`Artwork upload failed (${uploadResponse.status})`)
  }

  return {
    artwork_path: presign.key,
    artwork_provider: presign.artwork_provider,
  }
}

export async function deleteArtworkFromStorage(
  entity: ArtworkEntity,
  kind: ArtworkKind,
  supabase: SupabaseClient | null,
): Promise<void> {
  if (!entity.artwork_path || !supabase) return

  const provider = normalizeArtworkProvider(entity.artwork_provider)

  if (provider === 'supabase') {
    const { error } = await supabase.storage.from(ARTWORK_BUCKET).remove([entity.artwork_path])
    if (error) {
      console.warn('Failed to delete Supabase artwork:', error)
    }
    return
  }

  if (provider === 'r2') {
    const accessToken = await getAccessToken(supabase)
    if (!accessToken) {
      throw new Error('Not authenticated')
    }

    await $fetch('/api/storage/delete-artwork-object', {
      method: 'POST',
      body: {
        kind,
        path: entity.artwork_path,
        ...(entity.id
          ? kind === 'track'
            ? { trackId: entity.id }
            : { collectionId: entity.id }
          : {}),
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return
  }
}
