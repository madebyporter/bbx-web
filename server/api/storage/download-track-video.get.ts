import { createError, getQuery, setHeader } from 'h3'
import { downloadR2Object } from '../../utils/r2'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

/**
 * Same-origin cloud track-video download (avoids R2 browser CORS on localhost / Netlify previews).
 * Query: soundId=
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const soundId = Number(getQuery(event).soundId)

  if (!Number.isFinite(soundId) || soundId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'soundId is required',
    })
  }

  const supabase = getServiceSupabase()
  const { data: track, error } = await supabase
    .from('sounds')
    .select('id, user_id, video_path, video_provider, title')
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

  const videoPath =
    typeof track.video_path === 'string' && track.video_path.trim()
      ? track.video_path.trim()
      : ''
  if (!videoPath || track.video_provider !== 'r2') {
    throw createError({
      statusCode: 404,
      statusMessage: 'No cloud video saved for this track',
    })
  }

  const buffer = await downloadR2Object(videoPath)
  const titlePart =
    typeof track.title === 'string' && track.title.trim()
      ? track.title.trim().replace(/[^\w\-]+/g, '_').slice(0, 40)
      : 'track'
  const filename = `${titlePart}-video.mp4`

  setHeader(event, 'Content-Type', 'video/mp4')
  setHeader(event, 'Content-Disposition', `inline; filename="${filename}"`)
  setHeader(event, 'Cache-Control', 'private, max-age=60')
  setHeader(event, 'X-Video-Filename', filename)

  return buffer
})
