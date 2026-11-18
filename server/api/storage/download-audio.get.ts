import { createError, getQuery, setHeader } from 'h3'
import { headR2Object } from '../../utils/r2'
import { loadTrackAudioBuffer } from '../../utils/trackMedia'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

/** Stay under typical Netlify/serverless response body limits when this is ever hit remotely. */
const MAX_PROXY_BYTES = Math.floor(4.5 * 1024 * 1024)

/**
 * Same-origin track audio download for localhost (avoids R2 browser CORS).
 * Not suitable for large files on Netlify — client should use signed R2 GET instead.
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

  if (track.storage_provider === 'r2') {
    try {
      const head = await headR2Object(track.storage_path)
      if (head.contentLength != null && head.contentLength > MAX_PROXY_BYTES) {
        throw createError({
          statusCode: 413,
          statusMessage:
            'Track too large to proxy through the API. Use direct R2 download (bucket CORS GET *).',
        })
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err) throw err
      // Head failed — still attempt download; loadTrackAudioBuffer will error if missing
    }
  }

  const audio = await loadTrackAudioBuffer({
    storage_path: track.storage_path,
    storage_provider: track.storage_provider,
  })

  if (audio.buffer.byteLength > MAX_PROXY_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage:
        'Track too large to proxy through the API. Use direct R2 download (bucket CORS GET *).',
    })
  }

  setHeader(event, 'Content-Type', audio.contentType)
  setHeader(
    event,
    'Content-Disposition',
    `inline; filename="${audio.filename.replace(/"/g, '')}"`,
  )
  setHeader(event, 'Cache-Control', 'private, max-age=60')

  return audio.buffer
})
