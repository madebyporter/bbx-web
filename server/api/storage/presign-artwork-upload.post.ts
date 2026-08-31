import { createError, readBody } from 'h3'
import { sanitizeStorageFilename } from '~/utils/sanitizeStorageFilename'
import { isAllowedArtworkContentType, normalizeArtworkContentType } from '../../utils/artworkMime'
import { type ArtworkKind, presignR2Upload, readArtworkBucket } from '../../utils/r2'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

interface PresignArtworkUploadBody {
  filename?: string
  contentType?: string
  kind?: ArtworkKind
  collectionId?: number | string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<PresignArtworkUploadBody>(event)

  const filename = body.filename?.trim()
  const kind = body.kind

  if (!filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'filename is required',
    })
  }

  if (kind !== 'track' && kind !== 'collection') {
    throw createError({
      statusCode: 400,
      statusMessage: 'kind must be track or collection',
    })
  }

  const contentType = normalizeArtworkContentType(body.contentType || '', filename)
  if (!isAllowedArtworkContentType(contentType, filename)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported artwork content type',
    })
  }

  if (kind === 'collection') {
    const collectionId = Number(body.collectionId)
    if (!Number.isFinite(collectionId) || collectionId <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'collectionId is required for collection artwork uploads',
      })
    }

    const supabase = getServiceSupabase()
    const { data: collection, error } = await supabase
      .from('collections')
      .select('id, user_id')
      .eq('id', collectionId)
      .maybeSingle()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      })
    }

    if (!collection || collection.user_id !== user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
      })
    }
  }

  const safeName = sanitizeStorageFilename(filename)
  const key = `${user.id}/${Date.now()}-${safeName}`
  const bucket = readArtworkBucket(kind)
  const uploadUrl = await presignR2Upload(key, contentType, 3600, bucket)

  return {
    key,
    uploadUrl,
    contentType,
    artwork_provider: 'r2' as const,
  }
})
