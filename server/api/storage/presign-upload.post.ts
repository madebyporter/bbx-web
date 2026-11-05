import { createError, readBody } from 'h3'
import { sanitizeStorageFilename } from '~/utils/sanitizeStorageFilename'
import { assertCanUpload, userHasAdminRole } from '../../utils/billing'
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
  const body = await readBody<{
    filename?: string
    contentType?: string
    size?: number
    replacingTrackId?: number | null
  }>(event)

  const filename = body.filename?.trim()
  if (!filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'filename is required',
    })
  }

  const size = Number(body.size)
  if (!Number.isFinite(size) || size <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'size is required',
    })
  }

  await assertCanUpload(user.id, size, {
    replacingTrackId: body.replacingTrackId ?? null,
    isAdmin: userHasAdminRole(user),
  })

  const contentType = normalizeAudioContentType(body.contentType || '', filename)
  const safeName = sanitizeStorageFilename(filename)
  const key = `${user.id}/${Date.now()}-${safeName}`
  const uploadUrl = await presignR2Upload(key, contentType, 3600, undefined, {
    contentLength: size,
  })

  return {
    key,
    uploadUrl,
    contentType,
    storage_provider: 'r2' as const,
  }
})
