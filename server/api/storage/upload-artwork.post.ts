import { createError, readMultipartFormData } from 'h3'
import { sanitizeStorageFilename } from '~/utils/sanitizeStorageFilename'
import { isAllowedArtworkContentType, normalizeArtworkContentType } from '../../utils/artworkMime'
import { type ArtworkKind, readArtworkBucket, uploadR2Object } from '../../utils/r2'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

const MAX_ARTWORK_BYTES = 10 * 1024 * 1024

/**
 * Same-origin artwork upload (used on localhost to bypass R2 browser CORS).
 * Production keeps using presigned PUT directly to R2.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const parts = await readMultipartFormData(event)

  if (!parts?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid multipart body',
    })
  }

  let fileBuffer: Buffer | null = null
  let filename = ''
  let mime = ''
  let kind: ArtworkKind | null = null
  let collectionIdRaw = ''

  for (const part of parts) {
    const field = part.name || ''
    if (field === 'file' && part.filename && part.data?.length) {
      fileBuffer = Buffer.from(part.data)
      filename = String(part.filename).slice(0, 255)
      mime = part.type || ''
    } else if (part.data) {
      const text = part.data.toString('utf8').trim()
      if (field === 'kind') kind = text as ArtworkKind
      else if (field === 'collectionId') collectionIdRaw = text
    }
  }

  if (!fileBuffer || !filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'file is required',
    })
  }

  if (fileBuffer.length > MAX_ARTWORK_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Artwork exceeds 10MB limit',
    })
  }

  if (kind !== 'track' && kind !== 'collection') {
    throw createError({
      statusCode: 400,
      statusMessage: 'kind must be track or collection',
    })
  }

  const contentType = normalizeArtworkContentType(mime, filename)
  if (!isAllowedArtworkContentType(contentType, filename)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported artwork content type',
    })
  }

  if (kind === 'collection') {
    const collectionId = Number(collectionIdRaw)
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
  await uploadR2Object(key, fileBuffer, contentType, bucket)

  return {
    key,
    contentType,
    artwork_path: key,
    artwork_provider: 'r2' as const,
  }
})
