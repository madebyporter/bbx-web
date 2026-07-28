import type { SupabaseClient } from '@supabase/supabase-js'
import type { Track } from '~/types/track'

interface CollectionRef {
  name: string
  slug: string
  user_id?: string
}

export type TrackWithCollections = Track & {
  collections: Array<{ name: string; slug: string }>
}

type EnrichableTrack = {
  id: number
  track_status?: Track['track_status']
  track_statuses?: Track['track_status']
} & Record<string, unknown>

export async function enrichTracksWithCollections<T extends EnrichableTrack>(
  supabase: SupabaseClient,
  rawTracks: T[],
  options?: { collectionOwnerId?: string | null }
): Promise<Array<T & { collections: Array<{ name: string; slug: string }>; track_status: Track['track_status'] }>> {
  if (rawTracks.length === 0) return []

  const soundIds = rawTracks.map((t) => t.id)
  const { data: allJunctionData } = await supabase
    .from('collections_sounds')
    .select('sound_id, collection_id')
    .in('sound_id', soundIds)

  const collectionIdsBySoundId = new Map<number, number[]>()
  const allCollectionIds = new Set<number>()
  for (const row of allJunctionData || []) {
    const junction = row as { sound_id: number; collection_id: number }
    const sid = junction.sound_id
    const cid = junction.collection_id
    if (!collectionIdsBySoundId.has(sid)) collectionIdsBySoundId.set(sid, [])
    collectionIdsBySoundId.get(sid)!.push(cid)
    allCollectionIds.add(cid)
  }

  let collectionsList: (CollectionRef & { id: number })[] = []
  if (allCollectionIds.size > 0) {
    const { data: collectionsData } = await supabase
      .from('collections')
      .select('id, name, slug, user_id')
      .in('id', Array.from(allCollectionIds))
    collectionsList = (collectionsData || []) as (CollectionRef & { id: number })[]
  }

  const collectionMap = new Map(collectionsList.map((c) => [c.id, c]))
  const collectionOwnerId = options?.collectionOwnerId ?? null

  return rawTracks.map((track) => {
    const collectionIds = collectionIdsBySoundId.get(track.id) || []
    const cols = collectionIds
      .map((id) => collectionMap.get(id))
      .filter((c): c is CollectionRef & { id: number } => !!c)
    const collections = collectionOwnerId
      ? cols
          .filter((c) => c.user_id === collectionOwnerId)
          .map((c) => ({ name: c.name, slug: c.slug }))
      : cols.map((c) => ({ name: c.name, slug: c.slug }))
    return {
      ...track,
      collections,
      track_status: track.track_statuses ?? track.track_status ?? null,
    }
  })
}
