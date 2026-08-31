import { createError, readBody } from 'h3'
import {
  assertCollectionArtworkProvider,
  assertTrackArtworkProvider,
  canViewCollectionArtwork,
  canViewTrackArtwork,
  loadArtworkEntity,
} from '../../utils/artworkAccess'
import { type ArtworkKind, presignR2Download, readArtworkBucket } from '../../utils/r2'
import { getAuthUser } from '../../utils/supabaseAuth'

interface BatchItem {
  kind?: ArtworkKind
  id?: number | string
}

interface PresignArtworkBatchBody {
  items?: BatchItem[]
}

const MAX_BATCH_SIZE = 50

export default defineEventHandler(async (event) => {
  const body = await readBody<PresignArtworkBatchBody>(event)
  const items = body.items || []

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'items is required',
    })
  }

  if (items.length > MAX_BATCH_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage: `items must contain at most ${MAX_BATCH_SIZE} entries`,
    })
  }

  const { user } = await getAuthUser(event)
  const urls: Record<string, string | null> = {}

  await Promise.all(
    items.map(async (item) => {
      const kind = item.kind
      const id = Number(item.id)
      const cacheKey = `${kind}:${id}`

      if (kind !== 'track' && kind !== 'collection') {
        urls[cacheKey] = null
        return
      }

      if (!Number.isFinite(id) || id <= 0) {
        urls[cacheKey] = null
        return
      }

      try {
        const entity = await loadArtworkEntity(kind, id)

        const allowed =
          kind === 'track'
            ? await canViewTrackArtwork(entity as typeof entity & { is_public?: boolean | null }, user)
            : await canViewCollectionArtwork(entity, user)

        if (!allowed) {
          urls[cacheKey] = null
          return
        }

        if (kind === 'track') {
          assertTrackArtworkProvider(entity.artwork_provider)
        } else {
          assertCollectionArtworkProvider(entity.artwork_provider)
        }

        const bucket = readArtworkBucket(kind)
        urls[cacheKey] = await presignR2Download(entity.artwork_path!, 86400, bucket)
      } catch {
        urls[cacheKey] = null
      }
    }),
  )

  return {
    urls,
    expiresIn: 86400,
  }
})
