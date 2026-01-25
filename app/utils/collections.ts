// Collection utilities for slug generation and management

import { useSupabase } from '~/utils/supabase'

/**
 * Generate a URL-friendly slug from a collection name
 * @param name - The collection name
 * @returns A lowercase, hyphenated slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Generate a unique slug by appending a number if needed
 * @param baseName - The collection name
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function generateUniqueSlug(baseName: string, existingSlugs: string[]): string {
  let slug = generateSlug(baseName)
  let counter = 1
  
  while (existingSlugs.includes(slug)) {
    slug = `${generateSlug(baseName)}-${counter}`
    counter++
  }
  
  return slug
}

export interface CollectionMember {
  id: number
  collection_id: number
  member_id: string
  invited_by: string | null
  created_at: string
}

export interface UserSearchResult {
  id: string
  username: string | null
  display_name: string | null
}

/**
 * Search users for collection invitation
 * Filters out the collection owner and existing members
 */
export async function searchUsersForCollectionInvite(
  collectionId: number,
  query: string,
  limit: number = 20
): Promise<UserSearchResult[]> {
  const { supabase } = useSupabase()
  if (!supabase) return []
  
  const searchTerm = query.trim().toLowerCase()
  if (!searchTerm) return []
  
  try {
    // Get collection owner and existing members to filter them out
    const { data: collectionData } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', collectionId)
      .single()
    
    if (!collectionData) return []
    
    const { data: existingMembers } = await supabase
      .from('collection_members')
      .select('member_id')
      .eq('collection_id', collectionId)
    
    const existingMemberIds = [
      collectionData.user_id,
      ...(existingMembers || []).map((m: any) => m.member_id)
    ]
    
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
    
    // Filter out collection owner and existing members
    const filtered = uniqueData.filter((item: any) => 
      !existingMemberIds.includes(item.id)
    )
    
    return filtered.map((item: any) => ({
      id: item.id,
      username: item.username,
      display_name: item.display_name
    }))
  } catch (error) {
    console.error('Error searching users for collection invite:', error)
    return []
  }
}

/**
 * Invite a member to a collection
 */
export async function inviteCollectionMember(
  collectionId: number,
  memberId: string,
  invitedBy: string
): Promise<void> {
  const { supabase } = useSupabase()
  if (!supabase) throw new Error('Supabase not initialized')
  
  try {
    const { error } = await supabase
      .from('collection_members')
      .insert({
        collection_id: collectionId,
        member_id: memberId,
        invited_by: invitedBy
      })
    
    if (error) throw error
  } catch (error) {
    console.error('Error inviting collection member:', error)
    throw error
  }
}

/**
 * Remove a member from a collection
 */
export async function removeCollectionMember(
  collectionId: number,
  memberId: string
): Promise<void> {
  const { supabase } = useSupabase()
  if (!supabase) throw new Error('Supabase not initialized')
  
  try {
    const { error } = await supabase
      .from('collection_members')
      .delete()
      .eq('collection_id', collectionId)
      .eq('member_id', memberId)
    
    if (error) throw error
  } catch (error) {
    console.error('Error removing collection member:', error)
    throw error
  }
}

/**
 * Get all members of a collection
 */
export async function getCollectionMembers(collectionId: number): Promise<CollectionMember[]> {
  const { supabase } = useSupabase()
  if (!supabase) return []
  
  try {
    const { data, error } = await supabase
      .from('collection_members')
      .select(`
        id,
        collection_id,
        member_id,
        invited_by,
        created_at
      `)
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return (data || []) as CollectionMember[]
  } catch (error) {
    console.error('Error fetching collection members:', error)
    return []
  }
}

/**
 * Check if a user is a member of a collection
 */
export async function isCollectionMember(
  collectionId: number,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false
  
  const { supabase } = useSupabase()
  if (!supabase) return false
  
  try {
    const { data, error } = await supabase
      .from('collection_members')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('member_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking collection membership:', error)
      return false
    }
    
    return !!data
  } catch (error) {
    console.error('Error checking collection membership:', error)
    return false
  }
}

/**
 * Generate a shareable invite link for a collection
 */
export function generateCollectionInviteLink(collectionId: number): string {
  if (typeof window === 'undefined') return ''
  const baseUrl = window.location.origin
  return `${baseUrl}/collections/invite/${collectionId}`
}

/**
 * Accept collection invite (for shareable links)
 */
export async function acceptCollectionInvite(
  collectionId: number,
  userId: string
): Promise<void> {
  const { supabase } = useSupabase()
  if (!supabase) throw new Error('Supabase not initialized')
  
  try {
    // Check if already a member
    const isMember = await isCollectionMember(collectionId, userId)
    if (isMember) {
      return // Already a member, no need to add again
    }
    
    // Add as member (self-invited via link)
    const { error } = await supabase
      .from('collection_members')
      .insert({
        collection_id: collectionId,
        member_id: userId,
        invited_by: userId // Self-invited via link
      })
    
    if (error) throw error
  } catch (error) {
    console.error('Error accepting collection invite:', error)
    throw error
  }
}
