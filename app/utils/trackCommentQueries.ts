import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import type { TrackComment } from '~/types/trackComment'

function mergeProfilesIntoComments(
  comments: Array<{
    id: number
    track_id: number
    collection_id: number | null
    user_id: string
    content: string
    created_at: string
    updated_at: string
  }>,
  profilesById: Record<string, { username: string; display_name: string | null }>
): TrackComment[] {
  return comments.map((comment) => ({
    ...comment,
    user: profilesById[comment.user_id]
      ? {
          username: profilesById[comment.user_id]!.username,
          display_name: profilesById[comment.user_id]!.display_name || undefined,
        }
      : undefined,
  }))
}

async function fetchProfilesForComments(userIds: string[]) {
  const { supabase } = useSupabase()
  if (!supabase || userIds.length === 0) return {}

  const { data: profilesData } = await supabase
    .from('user_profiles')
    .select('id, username, display_name')
    .in('id', userIds)

  return (profilesData || []).reduce(
    (acc: Record<string, { username: string; display_name: string | null }>, profile: any) => {
      acc[profile.id] = { username: profile.username, display_name: profile.display_name }
      return acc
    },
    {}
  )
}

export async function fetchTrackComments(
  trackId: number,
  collectionId?: number | null
): Promise<TrackComment[]> {
  const { supabase } = useSupabase()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    let query = supabase
      .from('track_comments')
      .select('id, track_id, collection_id, user_id, content, created_at, updated_at')
      .eq('track_id', trackId)
      .order('created_at', { ascending: false })

    if (collectionId != null) {
      query = query.eq('collection_id', collectionId)
    } else {
      query = query.is('collection_id', null)
    }

    const { data: commentsData, error } = await query
    if (error) throw error

    const comments = commentsData || []
    const uniqueUserIds = Array.from(new Set(comments.map((c) => c.user_id).filter(Boolean)))
    const profilesById = await fetchProfilesForComments(uniqueUserIds as string[])

    return mergeProfilesIntoComments(comments, profilesById)
  } catch (error) {
    console.error('Error fetching track comments:', error)
    return []
  }
}

export async function createTrackComment(
  trackId: number,
  content: string,
  collectionId?: number | null
): Promise<TrackComment | null> {
  const { supabase } = useSupabase()
  const auth = useAuth()

  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  if (!auth.user.value) {
    throw new Error('Must be logged in to create a comment')
  }

  const trimmed = content.trim()
  if (!trimmed) {
    throw new Error('Comment cannot be empty')
  }

  try {
    const insertPayload: {
      track_id: number
      user_id: string
      content: string
      collection_id?: number | null
    } = {
      track_id: trackId,
      user_id: auth.user.value.id,
      content: trimmed,
    }

    if (collectionId != null) {
      insertPayload.collection_id = collectionId
    }

    const { data, error } = await supabase
      .from('track_comments')
      .insert([insertPayload])
      .select('id, track_id, collection_id, user_id, content, created_at, updated_at')
      .single()

    if (error) throw error
    if (!data) return null

    const profilesById = await fetchProfilesForComments([data.user_id])
    return mergeProfilesIntoComments([data], profilesById)[0] ?? null
  } catch (error) {
    console.error('Error creating track comment:', error)
    throw error
  }
}

export async function updateTrackComment(id: number, content: string): Promise<TrackComment | null> {
  const { supabase } = useSupabase()
  const auth = useAuth()

  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  if (!auth.user.value) {
    throw new Error('Must be logged in to update a comment')
  }

  const trimmed = content.trim()
  if (!trimmed) {
    throw new Error('Comment cannot be empty')
  }

  try {
    const { data, error } = await supabase
      .from('track_comments')
      .update({ content: trimmed })
      .eq('id', id)
      .eq('user_id', auth.user.value.id)
      .select('id, track_id, collection_id, user_id, content, created_at, updated_at')
      .single()

    if (error) throw error
    if (!data) return null

    const profilesById = await fetchProfilesForComments([data.user_id])
    return mergeProfilesIntoComments([data], profilesById)[0] ?? null
  } catch (error) {
    console.error('Error updating track comment:', error)
    throw error
  }
}

export async function deleteTrackComment(id: number): Promise<boolean> {
  const { supabase } = useSupabase()
  const auth = useAuth()

  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  if (!auth.user.value) {
    throw new Error('Must be logged in to delete a comment')
  }

  try {
    const { error } = await supabase
      .from('track_comments')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.value.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting track comment:', error)
    throw error
  }
}
