import { createError, readBody } from 'h3'
import { presignR2Download } from '../../utils/r2'
import { getAuthUser, getServiceSupabase } from '../../utils/supabaseAuth'

interface PresignPlayBody {
  trackId?: number | string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PresignPlayBody>(event)
  const trackId = Number(body.trackId)

  if (!Number.isFinite(trackId) || trackId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'trackId is required',
    })
  }

  const supabase = getServiceSupabase()
  const { data: track, error } = await supabase
    .from('sounds')
    .select('id, user_id, storage_path, storage_provider, is_public')
    .eq('id', trackId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  if (!track?.storage_path) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Track not found',
    })
  }

  if (track.storage_provider !== 'r2') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Track is not stored on R2',
    })
  }

  const { user } = await getAuthUser(event)
  const isOwner = user?.id === track.user_id
  const isPublic = track.is_public !== false

  if (!isPublic && !isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  const playbackUrl = await presignR2Download(track.storage_path, 86400)

  return {
    playbackUrl,
    expiresIn: 86400,
  }
})
