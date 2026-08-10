import { createError, readBody } from 'h3'
import { deleteR2Object } from '../../utils/r2'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

interface DeleteObjectBody {
  trackId?: number | string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<DeleteObjectBody>(event)
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
    .select('id, user_id, storage_path, storage_provider')
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

  if (track.user_id !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  if (track.storage_provider !== 'r2') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Track is not stored on R2',
    })
  }

  await deleteR2Object(track.storage_path)

  return { ok: true }
})
