import { createError, readBody } from 'h3'
import { assertCollectionArtworkProvider, assertTrackArtworkProvider } from '../../utils/artworkAccess'
import { type ArtworkKind, deleteR2Object, readArtworkBucket } from '../../utils/r2'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

interface DeleteArtworkObjectBody {
  kind?: ArtworkKind
  path?: string
  trackId?: number | string
  collectionId?: number | string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<DeleteArtworkObjectBody>(event)
  const kind = body.kind
  const path = body.path?.trim()

  if (kind !== 'track' && kind !== 'collection') {
    throw createError({
      statusCode: 400,
      statusMessage: 'kind must be track or collection',
    })
  }

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'path is required',
    })
  }

  const entityId =
    kind === 'track' ? Number(body.trackId) : Number(body.collectionId)

  const supabase = getServiceSupabase()

  if (!Number.isFinite(entityId) || entityId <= 0) {
    if (!path.startsWith(`${user.id}/`)) {
      throw createError({
        statusCode: 400,
        statusMessage: kind === 'track' ? 'trackId is required' : 'collectionId is required',
      })
    }

    const bucket = readArtworkBucket(kind)
    await deleteR2Object(path, bucket)
    return { ok: true }
  }

  if (kind === 'track') {
    const { data: track, error } = await supabase
      .from('sounds')
      .select('id, user_id, artwork_path, artwork_provider')
      .eq('id', entityId)
      .maybeSingle()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      })
    }

    if (!track || track.user_id !== user.id || track.artwork_path !== path) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
      })
    }

    assertTrackArtworkProvider(track.artwork_provider)
  } else {
    const { data: collection, error } = await supabase
      .from('collections')
      .select('id, user_id, artwork_path, artwork_provider')
      .eq('id', entityId)
      .maybeSingle()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      })
    }

    if (!collection || collection.user_id !== user.id || collection.artwork_path !== path) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
      })
    }

    assertCollectionArtworkProvider(collection.artwork_provider)
  }

  const bucket = readArtworkBucket(kind)
  await deleteR2Object(path, bucket)

  return { ok: true }
})
