import { getQuery } from 'h3'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

const MAX_IDS = 100

export type SyncAggregate = 'none' | 'all' | 'some' | 'error'

function aggregateStatuses(statuses: string[]): SyncAggregate {
  if (!statuses.length) return 'none'
  const synced = statuses.filter((s) => s === 'synced').length
  const failed = statuses.filter((s) => s === 'failed').length
  if (synced === statuses.length) return 'all'
  if (failed === statuses.length) return 'error'
  return 'some'
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const raw = String(query.sound_ids || '')
  const soundIds = [
    ...new Set(
      raw
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ].slice(0, MAX_IDS)

  if (!soundIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sound_ids is required',
    })
  }

  const supabase = getServiceSupabase()

  const { data: owned, error: ownedError } = await supabase
    .from('sounds')
    .select('id')
    .eq('user_id', user.id)
    .in('id', soundIds)

  if (ownedError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load tracks: ${ownedError.message}`,
    })
  }

  const ownedIds = (owned || []).map((row) => row.id as number)
  const aggregates: Record<string, SyncAggregate> = {}
  for (const id of soundIds) {
    aggregates[String(id)] = 'none'
  }

  if (!ownedIds.length) {
    return { aggregates }
  }

  const { data, error } = await supabase
    .from('track_platform_syncs')
    .select('sound_id, status')
    .eq('user_id', user.id)
    .in('sound_id', ownedIds)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load sync status: ${error.message}`,
    })
  }

  const bySound = new Map<number, string[]>()
  for (const row of data || []) {
    const soundId = Number(row.sound_id)
    const list = bySound.get(soundId) || []
    list.push(String(row.status))
    bySound.set(soundId, list)
  }

  for (const id of ownedIds) {
    aggregates[String(id)] = aggregateStatuses(bySound.get(id) || [])
  }

  return { aggregates }
})
