import { createError, readBody } from 'h3'
import {
  assertArtworkViewAccess,
  assertCollectionArtworkProvider,
  assertTrackArtworkProvider,
  loadArtworkEntity,
} from '../../utils/artworkAccess'
import { type ArtworkKind, presignR2Download, readArtworkBucket } from '../../utils/r2'
import { getAuthUser } from '../../utils/supabaseAuth'

interface PresignArtworkPlayBody {
  kind?: ArtworkKind
  trackId?: number | string
  collectionId?: number | string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PresignArtworkPlayBody>(event)
  const kind = body.kind

  if (kind !== 'track' && kind !== 'collection') {
    throw createError({
      statusCode: 400,
      statusMessage: 'kind must be track or collection',
    })
  }

  const entityId =
    kind === 'track' ? Number(body.trackId) : Number(body.collectionId)

  if (!Number.isFinite(entityId) || entityId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: kind === 'track' ? 'trackId is required' : 'collectionId is required',
    })
  }

  const entity = await loadArtworkEntity(kind, entityId)
  const { user } = await getAuthUser(event)
  await assertArtworkViewAccess(kind, entity, user)

  if (kind === 'track') {
    assertTrackArtworkProvider(entity.artwork_provider)
  } else {
    assertCollectionArtworkProvider(entity.artwork_provider)
  }

  const bucket = readArtworkBucket(kind)
  const artworkUrl = await presignR2Download(entity.artwork_path!, 86400, bucket)

  return {
    artworkUrl,
    expiresIn: 86400,
  }
})
