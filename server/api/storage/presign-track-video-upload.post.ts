import { createError, readBody } from 'h3'
import { sanitizeStorageFilename } from '~/utils/sanitizeStorageFilename'
import {
  assertCanSaveTrackVideo,
  assertTrackVideoSizeAllowed,
} from '../../utils/billing'
import { presignR2Upload } from '../../utils/r2'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

interface PresignTrackVideoBody {
  soundId?: number | string
  filename?: string
  contentType?: string
  size?: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const entitlements = await assertCanSaveTrackVideo(user)
  const body = await readBody<PresignTrackVideoBody>(event)

  const soundId = Number(body.soundId)
  if (!Number.isFinite(soundId) || soundId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'soundId is required',
    })
  }

  const filename = body.filename?.trim()
  if (!filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'filename is required',
    })
  }

  const size = Number(body.size)
  assertTrackVideoSizeAllowed(entitlements, size)

  const supabase = getServiceSupabase()
  const { data: track, error } = await supabase
    .from('sounds')
    .select('id, user_id')
    .eq('id', soundId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  if (!track || track.user_id !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  const rawType = (body.contentType || '').split(';')[0]?.trim().toLowerCase() || ''
  const contentType = rawType === 'video/mp4' || filename.toLowerCase().endsWith('.mp4')
    ? 'video/mp4'
    : ''
  if (contentType !== 'video/mp4') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only video/mp4 is supported for cloud video save',
    })
  }

  const safeName = sanitizeStorageFilename(filename.endsWith('.mp4') ? filename : `${filename}.mp4`)
  const key = `${user.id}/videos/${soundId}-${Date.now()}-${safeName}`
  const uploadUrl = await presignR2Upload(key, contentType, 3600, undefined, {
    contentLength: size,
  })

  return {
    key,
    uploadUrl,
    contentType,
    video_provider: 'r2' as const,
  }
})
