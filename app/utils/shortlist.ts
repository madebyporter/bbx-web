import { useSupabase } from '~/utils/supabase'

/**
 * Add a track to a creator's shortlist
 */
export async function addTrackToShortlist(trackId: number, creatorId: string): Promise<{ success: boolean; error?: any }> {
  const { supabase } = useSupabase()
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' }
  }

  try {
    const { error } = await supabase
      .from('track_shortlists')
      .insert({
        creator_id: creatorId,
        track_id: trackId
      })

    if (error) {
      // If it's a unique constraint violation, treat as success (already in shortlist)
      if (error.code === '23505') {
        return { success: true }
      }
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error adding track to shortlist:', error)
    return { success: false, error }
  }
}

/**
 * Remove a track from a creator's shortlist
 */
export async function removeTrackFromShortlist(trackId: number, creatorId: string): Promise<{ success: boolean; error?: any }> {
  const { supabase } = useSupabase()
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' }
  }

  try {
    const { error } = await supabase
      .from('track_shortlists')
      .delete()
      .eq('creator_id', creatorId)
      .eq('track_id', trackId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error removing track from shortlist:', error)
    return { success: false, error }
  }
}

/**
 * Get all shortlisted tracks for a creator with full track data
 */
export async function getShortlistedTracks(creatorId: string): Promise<{ data: any[] | null; error: any }> {
  const { supabase } = useSupabase()
  if (!supabase) {
    return { data: null, error: 'Supabase client not available' }
  }

  try {
    const { data, error } = await supabase
      .from('track_shortlists')
      .select(`
        track_id,
        created_at,
        sounds(
          *,
          track_statuses!status_id(id, name)
        )
      `)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to flatten the structure and fetch original owner info
    const tracks = await Promise.all((data || []).map(async (item: any) => {
      if (!item.sounds) return null
      
      // Fetch original owner profile
      let originalOwner = null
      if (item.sounds.user_id) {
        const { data: ownerData } = await supabase
          .from('user_profiles')
          .select('id, username, display_name')
          .eq('id', item.sounds.user_id)
          .single()
        
        originalOwner = ownerData
      }
      
      return {
        ...item.sounds,
        shortlisted_at: item.created_at,
        track_status: item.sounds.track_statuses,
        original_owner: originalOwner
      }
    }))

    // Filter out null entries
    const validTracks = tracks.filter(t => t !== null)

    return { data: validTracks, error: null }
  } catch (error) {
    console.error('Error fetching shortlisted tracks:', error)
    return { data: null, error }
  }
}

/**
 * Check if a specific track is shortlisted by a creator
 */
export async function isTrackShortlisted(trackId: number, creatorId: string): Promise<boolean> {
  const { supabase } = useSupabase()
  if (!supabase) {
    return false
  }

  try {
    const { data, error } = await supabase
      .from('track_shortlists')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('track_id', trackId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error checking if track is shortlisted:', error)
    return false
  }
}

/**
 * Get just the IDs of shortlisted tracks for a creator
 */
export async function getShortlistedTrackIds(creatorId: string): Promise<{ data: number[] | null; error: any }> {
  const { supabase } = useSupabase()
  if (!supabase) {
    return { data: null, error: 'Supabase client not available' }
  }

  try {
    const { data, error } = await supabase
      .from('track_shortlists')
      .select('track_id')
      .eq('creator_id', creatorId)

    if (error) throw error

    const trackIds = (data || []).map((item: any) => item.track_id)
    return { data: trackIds, error: null }
  } catch (error) {
    console.error('Error fetching shortlisted track IDs:', error)
    return { data: null, error }
  }
}

/**
 * Check which tracks from a list are shortlisted
 */
export async function checkIfTracksAreShortlisted(trackIds: number[], creatorId: string): Promise<Set<number>> {
  const { supabase } = useSupabase()
  if (!supabase || trackIds.length === 0) {
    return new Set()
  }

  try {
    const { data, error } = await supabase
      .from('track_shortlists')
      .select('track_id')
      .eq('creator_id', creatorId)
      .in('track_id', trackIds)

    if (error) throw error

    return new Set((data || []).map((item: any) => item.track_id))
  } catch (error) {
    console.error('Error checking shortlist status:', error)
    return new Set()
  }
}

