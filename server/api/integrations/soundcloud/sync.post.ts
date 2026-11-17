import { readBody } from 'h3'
import {
  hasRequiredMetadata,
  mapTrackToSoundCloudFields,
} from '~/utils/soundcloudTrackMetadata'
import { requireTrackSyncUser } from '../../../utils/integrationAuth'
import {
  getValidAccessToken,
  SOUNDCLOUD_PROVIDER,
  updateSoundCloudTrackMetadata,
  uploadTrackToSoundCloud,
} from '../../../utils/soundcloud'
import { loadTrackArtworkBuffer, loadTrackAudioBuffer } from '../../../utils/trackMedia'
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
      'id, user_id, title, artist, genre, mood, bpm, key, year, version, is_public, storage_path, storage_provider, artwork_path, artwork_provider',
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

  if (!hasRequiredMetadata(track)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title and artist are required before syncing to SoundCloud',
      data: { code: 'metadata_incomplete' },
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

  const fields = mapTrackToSoundCloudFields(track, { trackUrl })

  await supabase.from('track_platform_syncs').upsert(
    {
      sound_id: soundId,
      user_id: user.id,
      provider: SOUNDCLOUD_PROVIDER,
      status: 'pending',
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sound_id,provider' },
  )

  try {
    const accessToken = await getValidAccessToken(user.id)
    const artwork = await loadTrackArtworkBuffer(track)

    const { data: existing } = await supabase
      .from('track_platform_syncs')
      .select('external_id')
      .eq('sound_id', soundId)
      .eq('provider', SOUNDCLOUD_PROVIDER)
      .maybeSingle()

    let result
    if (existing?.external_id) {
      result = await updateSoundCloudTrackMetadata({
        accessToken,
        trackId: String(existing.external_id),
        fields,
        artwork,
      })
    } else {
      const audio = await loadTrackAudioBuffer(track)
      result = await uploadTrackToSoundCloud({
        accessToken,
        fields,
        audio,
        artwork,
      })
    }

    const externalId = String(result.urn || result.id)
    const permalink = result.permalink_url || null

    const { error: upsertError } = await supabase.from('track_platform_syncs').upsert(
      {
        sound_id: soundId,
        user_id: user.id,
        provider: SOUNDCLOUD_PROVIDER,
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
        statusMessage: `Synced to SoundCloud but failed to save status: ${upsertError.message}`,
      })
    }

    return {
      ok: true,
      provider: SOUNDCLOUD_PROVIDER,
      status: 'synced',
      externalId,
      permalink,
    }
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'statusMessage' in err
        ? String((err as { statusMessage?: string }).statusMessage)
        : err instanceof Error
          ? err.message
          : 'SoundCloud sync failed'

    await supabase.from('track_platform_syncs').upsert(
      {
        sound_id: soundId,
        user_id: user.id,
        provider: SOUNDCLOUD_PROVIDER,
        status: 'failed',
        last_error: message,
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
    })
  }
})
