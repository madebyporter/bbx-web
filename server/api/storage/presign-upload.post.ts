import { createError, readBody } from 'h3'
import { sanitizeStorageFilename } from '~/utils/sanitizeStorageFilename'
import { presignR2Upload } from '../../utils/r2'
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

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<{ filename?: string; contentType?: string }>(event)

  const filename = body.filename?.trim()
  if (!filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'filename is required',
    })
  }

  const contentType = normalizeAudioContentType(body.contentType || '', filename)
  const safeName = sanitizeStorageFilename(filename)
  const key = `${user.id}/${Date.now()}-${safeName}`
  const uploadUrl = await presignR2Upload(key, contentType)

  return {
    key,
    uploadUrl,
    contentType,
    storage_provider: 'r2' as const,
  }
})
