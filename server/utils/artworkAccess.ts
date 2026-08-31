import type { User } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { ArtworkKind } from './r2'
import { getServiceSupabase } from './supabaseAuth'

export interface ArtworkEntityRow {
  id: number
  user_id: string
  artwork_path: string | null
  artwork_provider: string | null
}

export async function fetchTrackArtworkRow(trackId: number): Promise<ArtworkEntityRow & { is_public: boolean | null }> {
  const supabase = getServiceSupabase()
  const { data: track, error } = await supabase
    .from('sounds')
    .select('id, user_id, artwork_path, artwork_provider, is_public')
    .eq('id', trackId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  if (!track?.artwork_path) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Track artwork not found',
    })
  }

  return track as ArtworkEntityRow & { is_public: boolean | null }
}

export async function fetchCollectionArtworkRow(collectionId: number): Promise<ArtworkEntityRow> {
  const supabase = getServiceSupabase()
  const { data: collection, error } = await supabase
    .from('collections')
    .select('id, user_id, artwork_path, artwork_provider')
    .eq('id', collectionId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  if (!collection?.artwork_path) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Collection artwork not found',
    })
  }

  return collection as ArtworkEntityRow
}

export function assertTrackArtworkProvider(provider: string | null | undefined): void {
  if (provider !== 'r2') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Track artwork is not stored on R2',
    })
  }
}

export function assertCollectionArtworkProvider(provider: string | null | undefined): void {
  if (provider !== 'r2') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Collection artwork is not stored on R2',
    })
  }
}

export async function canViewTrackArtwork(
  track: ArtworkEntityRow & { is_public?: boolean | null },
  user: User | null,
): Promise<boolean> {
  const isOwner = user?.id === track.user_id
  const isPublic = track.is_public !== false
  return isOwner || isPublic
}

export async function canViewCollectionArtwork(
  collection: ArtworkEntityRow,
  user: User | null,
): Promise<boolean> {
  if (user?.id === collection.user_id) {
    return true
  }

  if (!user) {
    return true
  }

  const supabase = getServiceSupabase()
  const { data: membership } = await supabase
    .from('collection_members')
    .select('id')
    .eq('collection_id', collection.id)
    .eq('member_id', user.id)
    .maybeSingle()

  return !!membership
}

export async function loadArtworkEntity(
  kind: ArtworkKind,
  id: number,
): Promise<ArtworkEntityRow & { is_public?: boolean | null }> {
  if (kind === 'track') {
    return fetchTrackArtworkRow(id)
  }
  return fetchCollectionArtworkRow(id)
}

export async function assertArtworkViewAccess(
  kind: ArtworkKind,
  entity: ArtworkEntityRow & { is_public?: boolean | null },
  user: User | null,
): Promise<void> {
  const allowed =
    kind === 'track'
      ? await canViewTrackArtwork(entity as ArtworkEntityRow & { is_public?: boolean | null }, user)
      : await canViewCollectionArtwork(entity, user)

  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }
}
