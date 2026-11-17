import { readBody } from 'h3'
import { requireTrackSyncUser } from '../../../utils/integrationAuth'
import { YOUTUBE_PROVIDER } from '../../../utils/youtube'
import { getServiceSupabase } from '../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  const { user } = await requireTrackSyncUser(event)
  const body = await readBody<{
    sound_id?: number
    video_id?: string
    permalink?: string | null
    error?: string | null
  }>(event)

  const soundId = Number(body?.sound_id)
  if (!Number.isFinite(soundId) || soundId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'sound_id is required' })
  }

  const supabase = getServiceSupabase()
  const { data: track, error: trackError } = await supabase
    .from('sounds')
    .select('id, user_id')
    .eq('id', soundId)
    .maybeSingle()

  if (trackError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load track: ${trackError.message}`,
    })
  }

  if (!track || track.user_id !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Track not found' })
  }

  if (body?.error) {
    await supabase.from('track_platform_syncs').upsert(
      {
        sound_id: soundId,
        user_id: user.id,
        provider: YOUTUBE_PROVIDER,
        status: 'failed',
        last_error: String(body.error).slice(0, 1000),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sound_id,provider' },
    )
    return { ok: false, status: 'failed' }
  }

  const videoId = String(body?.video_id || '').trim()
  if (!videoId) {
    throw createError({ statusCode: 400, statusMessage: 'video_id is required' })
  }

  const permalink =
    body?.permalink ||
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`

  const { error } = await supabase.from('track_platform_syncs').upsert(
    {
      sound_id: soundId,
      user_id: user.id,
      provider: YOUTUBE_PROVIDER,
      external_id: videoId,
      external_permalink: permalink,
      status: 'synced',
      last_synced_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sound_id,provider' },
  )

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save YouTube sync status: ${error.message}`,
    })
  }

  return { ok: true, status: 'synced', videoId, permalink }
})
