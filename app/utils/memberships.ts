import { useSupabase } from '~/utils/supabase'
import type { ProfileMember } from '~/types/resource'

/**
 * Check if a user is a member of a profile
 */
export async function isMemberOfProfile(
  profileId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false
  
  const { supabase } = useSupabase()
  if (!supabase) return false
  
  try {
    const { data, error } = await supabase
      .from('profile_members')
      .select('id')
      .eq('profile_id', profileId)
      .eq('member_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking membership:', error)
      return false
    }
    
    return !!data
  } catch (error) {
    console.error('Error checking membership:', error)
    return false
  }
}

/**
 * Get all members of a profile
 */
export async function getProfileMembers(profileId: string): Promise<ProfileMember[]> {
  const { supabase } = useSupabase()
  if (!supabase) return []
  
  try {
    const { data, error } = await supabase
      .from('profile_members')
      .select(`
        id,
        profile_id,
        member_id,
        invited_by,
        created_at
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return (data || []) as ProfileMember[]
  } catch (error) {
    console.error('Error fetching profile members:', error)
    return []
  }
}

/**
 * Invite a member to a profile
 */
export async function inviteMember(
  profileId: string,
  memberId: string,
  invitedBy: string
): Promise<void> {
  const { supabase } = useSupabase()
  if (!supabase) throw new Error('Supabase not initialized')
  
  try {
    const { error } = await supabase
      .from('profile_members')
      .insert({
        profile_id: profileId,
        member_id: memberId,
        invited_by: invitedBy
      })
    
    if (error) throw error
  } catch (error) {
    console.error('Error inviting member:', error)
    throw error
  }
}

/**
 * Remove a member from a profile
 */
export async function removeMember(
  profileId: string,
  memberId: string
): Promise<void> {
  const { supabase } = useSupabase()
  if (!supabase) throw new Error('Supabase not initialized')
  
  try {
    const { error } = await supabase
      .from('profile_members')
      .delete()
      .eq('profile_id', profileId)
      .eq('member_id', memberId)
    
    if (error) throw error
  } catch (error) {
    console.error('Error removing member:', error)
    throw error
  }
}

/**
 * Get user profile by username or ID for member lookup
 */
export async function getUserProfileByIdentifier(
  identifier: string
): Promise<{ id: string; username: string; display_name: string } | null> {
  const { supabase } = useSupabase()
  if (!supabase) return null
  
  try {
    // Try username first
    let { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name')
      .eq('username', identifier)
      .single()
    
    // If not found by username, try by ID
    if (error || !data) {
      const { data: dataById, error: errorById } = await supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .eq('id', identifier)
        .single()
      
      if (errorById || !dataById) return null
      return dataById
    }
    
    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

export interface UserSearchResult {
  id: string
  username: string | null
  display_name: string | null
  email?: string | null
}

/**
 * Search users for member invitation
 * Filters out the profile owner and existing members
 */
export async function searchUsersForInvite(
  profileId: string,
  query: string,
  limit: number = 20
): Promise<UserSearchResult[]> {
  const { supabase } = useSupabase()
  if (!supabase) return []
  
  const searchTerm = query.trim().toLowerCase()
  if (!searchTerm) return []
  
  try {
    // Get existing members to filter them out
    const existingMembers = await getProfileMembers(profileId)
    const existingMemberIds = existingMembers.map(m => m.member_id)
    
    // Search in username and display_name
    const [usernameResults, displayNameResults] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .ilike('username', `%${searchTerm}%`)
        .limit(limit),
      supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .ilike('display_name', `%${searchTerm}%`)
        .limit(limit)
    ])
    
    if (usernameResults.error || displayNameResults.error) {
      console.error('Error searching users:', usernameResults.error || displayNameResults.error)
      return []
    }
    
    // Combine and deduplicate results
    const combinedData = [...(usernameResults.data || []), ...(displayNameResults.data || [])]
    const uniqueData = Array.from(
      new Map(combinedData.map((item: any) => [item.id, item])).values()
    )
    
    // Filter out profile owner and existing members
    const filtered = uniqueData.filter((item: any) => 
      item.id !== profileId && !existingMemberIds.includes(item.id)
    )
    
    return filtered.map((item: any) => ({
      id: item.id,
      username: item.username,
      display_name: item.display_name
    }))
  } catch (error) {
    console.error('Error searching users for invite:', error)
    return []
  }
}
