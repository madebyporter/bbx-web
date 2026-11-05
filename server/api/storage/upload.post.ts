import { createError, getQuery, readMultipartFormData } from 'h3'
import { sanitizeStorageFilename } from '~/utils/sanitizeStorageFilename'
import { assertCanUpload, DEFAULT_MAX_FILE_BYTES, userHasAdminRole } from '../../utils/billing'
import { uploadR2Object } from '../../utils/r2'
import { requireAuthUser } from '../../utils/supabaseAuth'

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
])

function normalizeAudioContentType(contentType: string, filename: string): string {
  const base = contentType.split(';')[0]?.trim().toLowerCase() || ''
  if (ALLOWED_AUDIO_TYPES.has(base)) return base

  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'm4a') return 'audio/mp4'
  return 'audio/mpeg'
}

/**
 * Same-origin audio upload (used on localhost to bypass R2 browser CORS).
 * Production keeps using presigned PUT directly to R2.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const replacingTrackIdRaw = query.replacingTrackId
  const replacingTrackId =
    replacingTrackIdRaw != null && String(replacingTrackIdRaw).trim() !== ''
      ? Number(replacingTrackIdRaw)
      : null

  const parts = await readMultipartFormData(event)

  const filePart = parts?.find((part) => part.name === 'file' && part.filename && part.data?.length)
  if (!filePart?.filename || !filePart.data?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'file is required',
    })
  }

  const fileSize = filePart.data.length
  const entitlements = await assertCanUpload(user.id, fileSize, {
    replacingTrackId:
      replacingTrackId != null && Number.isFinite(replacingTrackId) ? replacingTrackId : null,
    isAdmin: userHasAdminRole(user),
  })

  const maxBytes = entitlements.max_file_size_bytes || DEFAULT_MAX_FILE_BYTES
  if (fileSize > maxBytes) {
    throw createError({
      statusCode: 402,
      statusMessage: 'plan_limit_reached',
      data: { reason: 'file_size', entitlements },
    })
  }

  const filename = String(filePart.filename).slice(0, 255)
  const contentType = normalizeAudioContentType(filePart.type || '', filename)
  const safeName = sanitizeStorageFilename(filename)
  const key = `${user.id}/${Date.now()}-${safeName}`

  await uploadR2Object(key, Buffer.from(filePart.data), contentType)

  return {
    key,
    contentType,
    storage_provider: 'r2' as const,
    storage_path: key,
    size: fileSize,
  }
})
