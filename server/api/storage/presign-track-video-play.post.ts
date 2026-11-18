import { createError, readBody } from 'h3'
import { presignR2Download } from '../../utils/r2'
import { requireAuthUser } from '../../utils/supabaseAuth'
import { getServiceSupabase } from '../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<{ soundId?: number | string }>(event)
  const soundId = Number(body?.soundId)

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

  const videoUrl = await presignR2Download(videoPath, 3600)
  const titlePart =
    typeof track.title === 'string' && track.title.trim()
      ? track.title.trim().replace(/[^\w\-]+/g, '_').slice(0, 40)
      : 'track'

  return {
    videoUrl,
    video_path: videoPath,
    filename: `${titlePart}-video.mp4`,
  }
})
