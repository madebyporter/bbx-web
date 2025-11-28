import { useSupabase } from '~/utils/supabase'
import { isMemberOfProfile } from '~/utils/memberships'

export interface Track {
  id: number
  user_id: string
  is_public?: boolean
  [key: string]: any
}

/**
 * Check if a user can view a specific track
 */
export async function canViewTrack(
  track: Track,
  viewerId: string | null
): Promise<boolean> {
  // Public tracks are visible to everyone
  if (track.is_public !== false) {
    return true
  }
  
  // Track owner always sees their tracks
  if (viewerId && track.user_id === viewerId) {
    return true
  }
  
  // Private tracks: check if viewer is a member of track owner's profile
  if (viewerId) {
    return await isMemberOfProfile(track.user_id, viewerId)
  }
  
  return false
}

/**
 * Build a Supabase filter for track visibility
 * This is used in queries to filter tracks based on privacy and membership
 */
export function buildVisibilityFilter(
  profileId: string,
  viewerId: string | null
): any {
  // If no viewer, only show public tracks
  if (!viewerId) {
    return { is_public: true }
  }
  
  // If viewer is the profile owner, show all tracks
  if (viewerId === profileId) {
    return {} // No filter needed, owner sees all
  }
  
  // For other viewers, we need to check membership
  // This will be handled by RLS policies, but we can add client-side filtering
  // The actual filtering should be done via RLS or by checking membership first
  return {
    // This is a placeholder - actual filtering happens via RLS
    // or by checking membership before querying
  }
}

/**
 * Helper to check if current user can view tracks from a profile
 * Returns the filter condition for Supabase queries
 */
export async function getTrackVisibilityCondition(
  profileId: string,
  viewerId: string | null
): Promise<{ is_public?: boolean; user_id?: string } | {}> {
  // Owner sees all
  if (viewerId === profileId) {
    return {}
  }
  
  // Check if viewer is a member
  if (viewerId) {
    const isMember = await isMemberOfProfile(profileId, viewerId)
    if (isMember) {
      return {} // Members see all tracks (public + private)
    }
  }
  
  // Non-members only see public tracks
  return { is_public: true }
}

