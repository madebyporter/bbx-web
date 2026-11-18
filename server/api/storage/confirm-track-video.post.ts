import { createError, readBody } from 'h3'
import {
  assertCanSaveTrackVideo,
  assertTrackVideoSizeAllowed,
} from '../../utils/billing'
import { deleteR2Object, headR2Object } from '../../utils/r2'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

interface ConfirmTrackVideoBody {
  soundId?: number | string
  key?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const entitlements = await assertCanSaveTrackVideo(user)
  const body = await readBody<ConfirmTrackVideoBody>(event)

  const soundId = Number(body.soundId)
  const key = body.key?.trim()

  if (!Number.isFinite(soundId) || soundId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'soundId is required',
    })
  }

  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'key is required',
    })
  }

  const expectedPrefix = `${user.id}/videos/${soundId}-`
  if (!key.startsWith(expectedPrefix)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  let head: { contentLength: number | null; contentType: string | null }
  try {
    head = await headR2Object(key)
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Object not found',
    })
  }

  const size = head.contentLength
  if (size == null || size <= 0) {
    await deleteR2Object(key).catch(() => {})
    throw createError({
      statusCode: 404,
      statusMessage: 'Object not found',
    })
  }

  try {
    assertTrackVideoSizeAllowed(entitlements, size)
  } catch (err) {
    await deleteR2Object(key).catch(() => {})
    throw err
  }

  const supabase = getServiceSupabase()
  const { data: track, error: loadError } = await supabase
    .from('sounds')
    .select('id, user_id, video_path, video_provider')
    .eq('id', soundId)
    .maybeSingle()

  if (loadError) {
    throw createError({
      statusCode: 500,
      statusMessage: loadError.message,
    })
  }

  if (!track || track.user_id !== user.id) {
    await deleteR2Object(key).catch(() => {})
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  const previousPath =
    typeof track.video_path === 'string' && track.video_path.trim() ? track.video_path.trim() : null

  const { data: updated, error: updateError } = await supabase
    .from('sounds')
    .update({
      video_path: key,
      video_provider: 'r2',
    })
    .eq('id', soundId)
    .eq('user_id', user.id)
    .select('id, video_path, video_provider')
    .maybeSingle()

  if (updateError) {
    await deleteR2Object(key).catch(() => {})
    throw createError({
      statusCode: 500,
      statusMessage: updateError.message,
    })
  }

  if (previousPath && previousPath !== key && track.video_provider === 'r2') {
    await deleteR2Object(previousPath).catch((err) => {
      console.warn('Failed to delete previous track video from R2:', err)
    })
  }

  return {
    video_path: updated?.video_path ?? key,
    video_provider: (updated?.video_provider as 'r2') ?? 'r2',
    size,
  }
})
