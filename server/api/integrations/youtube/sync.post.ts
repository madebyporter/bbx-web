import { readBody } from 'h3'
import { mapTrackToYouTubeSnippet } from '~/utils/youtubeTrackMetadata'
import { requireTrackSyncUser } from '../../../utils/integrationAuth'
import {
  getValidYouTubeAccessToken,
  updateYouTubeVideoSnippet,
  YOUTUBE_PROVIDER,
} from '../../../utils/youtube'
import { getServiceSupabase } from '../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  const { user } = await requireTrackSyncUser(event)
  const body = await readBody<{ sound_id?: number }>(event)
  const soundId = Number(body?.sound_id)

  if (!Number.isFinite(soundId) || soundId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'sound_id is required' })
  }

  const supabase = getServiceSupabase()
  const { data: track, error: trackError } = await supabase
    .from('sounds')
    .select(
      'id, user_id, title, artist, genre, mood, bpm, key, year, version, description, youtube_title',
    )
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

  const { data: existing } = await supabase
    .from('track_platform_syncs')
    .select('external_id, external_permalink')
    .eq('sound_id', soundId)
    .eq('provider', YOUTUBE_PROVIDER)
    .maybeSingle()

  const externalId =
    typeof existing?.external_id === 'string' ? existing.external_id.trim() : ''
  if (!externalId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'needs_upload',
      data: { code: 'needs_upload' },
    })
  }

  const siteUrl = (process.env.SITE_URL || 'https://beatbox.studio').replace(/\/$/, '')
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  const trackUrl = profile?.username
    ? `${siteUrl}/u/${profile.username}/t/${soundId}`
    : `${siteUrl}/u/${user.id}`

  let snippet
  try {
    snippet = mapTrackToYouTubeSnippet(track, { trackUrl })
  } catch (err: unknown) {
    throw createError({
      statusCode: 400,
      statusMessage: err instanceof Error ? err.message : 'Title is required before syncing to YouTube',
      data: { code: 'metadata_incomplete' },
    })
  }

  await supabase.from('track_platform_syncs').upsert(
    {
      sound_id: soundId,
      user_id: user.id,
      provider: YOUTUBE_PROVIDER,
      status: 'pending',
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sound_id,provider' },
  )

  try {
    const accessToken = await getValidYouTubeAccessToken(user.id)
    await updateYouTubeVideoSnippet({
      accessToken,
      videoId: externalId,
      snippet: {
        title: snippet.title,
        description: snippet.description,
        tags: snippet.tags,
      },
    })

    const permalink =
      (typeof existing?.external_permalink === 'string' && existing.external_permalink.trim()) ||
      `https://www.youtube.com/watch?v=${encodeURIComponent(externalId)}`

    const { error: upsertError } = await supabase.from('track_platform_syncs').upsert(
      {
        sound_id: soundId,
        user_id: user.id,
        provider: YOUTUBE_PROVIDER,
        external_id: externalId,
        external_permalink: permalink,
        status: 'synced',
        last_synced_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sound_id,provider' },
    )

    if (upsertError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Updated YouTube but failed to save status: ${upsertError.message}`,
      })
    }

    return {
      ok: true,
      provider: YOUTUBE_PROVIDER,
      status: 'synced',
      videoId: externalId,
      permalink,
      updated: true,
    }
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'statusMessage' in err
        ? String((err as { statusMessage?: string }).statusMessage)
        : err instanceof Error
          ? err.message
          : 'YouTube sync failed'

    await supabase.from('track_platform_syncs').upsert(
      {
        sound_id: soundId,
        user_id: user.id,
        provider: YOUTUBE_PROVIDER,
        status: 'failed',
        last_error: message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sound_id,provider' },
    )

    throw createError({
      statusCode:
        err && typeof err === 'object' && 'statusCode' in err
          ? Number((err as { statusCode?: number }).statusCode) || 502
          : 502,
      statusMessage: message,
      data: err && typeof err === 'object' && 'data' in err ? (err as { data?: unknown }).data : undefined,
    })
  }
})
