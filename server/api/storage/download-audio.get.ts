import { createError, getQuery, setHeader } from 'h3'
import { loadTrackAudioBuffer } from '../../utils/trackMedia'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

/**
 * Same-origin track audio download (avoids R2 browser CORS on localhost / Netlify previews).
 * Query: trackId=
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const trackId = Number(getQuery(event).trackId)

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

  const audio = await loadTrackAudioBuffer({
    storage_path: track.storage_path,
    storage_provider: track.storage_provider,
  })

  setHeader(event, 'Content-Type', audio.contentType)
  setHeader(
    event,
    'Content-Disposition',
    `inline; filename="${audio.filename.replace(/"/g, '')}"`,
  )
  setHeader(event, 'Cache-Control', 'private, max-age=60')

  return audio.buffer
})
