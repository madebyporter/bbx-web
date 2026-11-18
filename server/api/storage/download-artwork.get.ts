import { createError, getQuery, setHeader } from 'h3'
import {
  assertArtworkViewAccess,
  assertCollectionArtworkProvider,
  assertTrackArtworkProvider,
  loadArtworkEntity,
} from '../../utils/artworkAccess'
import { type ArtworkKind } from '../../utils/r2'
import { getAuthUser } from '../../utils/supabaseAuth'
import { loadTrackArtworkBuffer } from '../../utils/trackMedia'
import { downloadR2Object, readArtworkBucket } from '../../utils/r2'
import { getServiceSupabase } from '../../utils/supabaseAuth'

/**
 * Same-origin artwork download (avoids R2 browser CORS on localhost / odd ports).
 * Query: kind=track|collection & trackId|collectionId
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const kind = String(query.kind || '') as ArtworkKind

  if (kind !== 'track' && kind !== 'collection') {
    throw createError({
      statusCode: 400,
      statusMessage: 'kind must be track or collection',
    })
  }

  const entityId =
    kind === 'track' ? Number(query.trackId) : Number(query.collectionId)

  if (!Number.isFinite(entityId) || entityId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: kind === 'track' ? 'trackId is required' : 'collectionId is required',
    })
  }

  const entity = await loadArtworkEntity(kind, entityId)
  const { user } = await getAuthUser(event)
  await assertArtworkViewAccess(kind, entity, user)

  if (!entity.artwork_path) {
    throw createError({ statusCode: 404, statusMessage: 'No artwork' })
  }

  if (kind === 'track') {
    assertTrackArtworkProvider(entity.artwork_provider)
  } else {
    assertCollectionArtworkProvider(entity.artwork_provider)
  }

  let buffer: Buffer
  let contentType = 'image/jpeg'
  let filename = entity.artwork_path.split('/').pop() || 'artwork.jpg'

  if (kind === 'track') {
    const loaded = await loadTrackArtworkBuffer({
      artwork_path: entity.artwork_path,
      artwork_provider: entity.artwork_provider,
    })
    if (!loaded) {
      throw createError({ statusCode: 404, statusMessage: 'Artwork not found' })
    }
    buffer = loaded.buffer
    contentType = loaded.contentType
    filename = loaded.filename
  } else if (entity.artwork_provider === 'r2') {
    const bucket = readArtworkBucket('collection')
    buffer = await downloadR2Object(entity.artwork_path, bucket)
    const lower = filename.toLowerCase()
    if (lower.endsWith('.png')) contentType = 'image/png'
    else if (lower.endsWith('.webp')) contentType = 'image/webp'
    else if (lower.endsWith('.gif')) contentType = 'image/gif'
  } else {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase.storage.from('artwork').download(entity.artwork_path)
    if (error || !data) {
      throw createError({
        statusCode: 404,
        statusMessage: error?.message || 'Artwork not found',
      })
    }
    buffer = Buffer.from(await data.arrayBuffer())
  }

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Content-Disposition', `inline; filename="${filename.replace(/"/g, '')}"`)
  setHeader(event, 'Cache-Control', 'private, max-age=300')
  return buffer
})
