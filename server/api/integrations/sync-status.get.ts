import { getQuery } from 'h3'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const soundId = Number(query.sound_id)

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

  const { data, error } = await supabase
    .from('track_platform_syncs')
    .select('provider, status, external_id, external_permalink, last_synced_at, last_error')
    .eq('sound_id', soundId)
    .eq('user_id', user.id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load sync status: ${error.message}`,
    })
  }

  const byProvider: Record<
    string,
    {
      status: string
      externalId: string | null
      permalink: string | null
      lastSyncedAt: string | null
      lastError: string | null
    }
  > = {}

  for (const row of data || []) {
    byProvider[row.provider] = {
      status: row.status,
      externalId: row.external_id,
      permalink: row.external_permalink,
      lastSyncedAt: row.last_synced_at,
      lastError: row.last_error,
    }
  }

  return { soundId, providers: byProvider }
})
