import { createError, readMultipartFormData } from 'h3'
import { sanitizeStorageFilename } from '~/utils/sanitizeStorageFilename'
import { uploadR2Object } from '../../utils/r2'
import { requireAuthUser } from '../../utils/supabaseAuth'

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
])

const MAX_AUDIO_BYTES = 50 * 1024 * 1024

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
  const parts = await readMultipartFormData(event)

  const filePart = parts?.find((part) => part.name === 'file' && part.filename && part.data?.length)
  if (!filePart?.filename || !filePart.data?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'file is required',
    })
  }

  if (filePart.data.length > MAX_AUDIO_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'File exceeds 50MB limit',
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
  }
})
