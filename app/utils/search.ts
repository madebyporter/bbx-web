/**
 * Search utilities for different content types
 */

import { useSupabase } from './supabase'
import type { SearchResult } from './searchNavigation'

/**
 * Generate a track slug from track data
 */
function generateTrackSlug(track: { title?: string; id: number }): string {
  if (track.title) {
    const slug = track.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `${slug}-${track.id}`
  }
  return `track-${track.id}`
}

/**
 * Search software resources
 */
export async function searchSoftware(query: string, limit: number = 20): Promise<SearchResult[]> {
  const { supabase } = useSupabase()
  if (!supabase) return []

  const searchTerm = query.trim().toLowerCase()
  if (!searchTerm) return []

  try {
    // First, get software type ID
    const { data: typeData } = await supabase
      .from('resource_types')
      .select('id')
      .eq('slug', 'software')
      .single()
    
    if (!typeData) return []

    const { data, error } = await supabase
      .from('resources')
      .select(`
        id,
        name,
        creators(name),
        type_id
      `)
      .eq('status', 'approved')
      .eq('type_id', typeData.id)
      .ilike('name', `%${searchTerm}%`)
      .limit(limit)

    if (error) {
      console.error('Error searching software:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      type: 'software' as const,
      id: item.id,
      title: item.name,
      subtitle: (Array.isArray(item.creators) && item.creators[0]?.name) || 'Unknown Creator',
      url: '/software',
      metadata: {}
    }))
  } catch (error) {
    console.error('Error searching software:', error)
    return []
  }
}

/**
 * Search tracks
 */
export async function searchTracks(query: string, limit: number = 20): Promise<SearchResult[]> {
  const { supabase } = useSupabase()
  if (!supabase) return []

  const searchTerm = query.trim().toLowerCase()
  if (!searchTerm) return []

  try {
    // Search in title and artist - use separate queries and combine results
    const [titleResults, artistResults] = await Promise.all([
      supabase
        .from('sounds')
        .select(`
          id,
          title,
          artist,
          user_id,
          user_profiles(username)
        `)
        .eq('is_public', true)
        .ilike('title', `%${searchTerm}%`)
        .limit(limit),
      supabase
        .from('sounds')
        .select(`
          id,
          title,
          artist,
          user_id,
          user_profiles(username)
        `)
        .eq('is_public', true)
        .ilike('artist', `%${searchTerm}%`)
        .limit(limit)
    ])

    if (titleResults.error || artistResults.error) {
      console.error('Error searching tracks:', titleResults.error || artistResults.error)
      return []
    }

    // Combine and deduplicate results
    const combinedData = [...(titleResults.data || []), ...(artistResults.data || [])]
    const uniqueData = Array.from(
      new Map(combinedData.map((item: any) => [item.id, item])).values()
    )

    return uniqueData.map((item: any) => ({
      type: 'track' as const,
      id: item.id,
      title: item.title || 'Untitled',
      subtitle: item.artist || 'Unknown Artist',
      url: `/u/${item.user_profiles?.username || item.user_id}/t/${generateTrackSlug({ title: item.title, id: item.id })}`,
      metadata: {
        username: item.user_profiles?.username,
        ownerId: item.user_id
      }
    }))
  } catch (error) {
    console.error('Error searching tracks:', error)
    return []
  }
}

/**
 * Search collections
 */
export async function searchCollections(query: string, limit: number = 20): Promise<SearchResult[]> {
  const { supabase } = useSupabase()
  if (!supabase) return []

  const searchTerm = query.trim().toLowerCase()
  if (!searchTerm) return []

  try {
    // Search in name and description - use separate queries and combine results
    const [nameResults, descResults] = await Promise.all([
      supabase
        .from('collections')
        .select(`
          id,
          name,
          description,
          slug,
          user_id,
          user_profiles(username)
        `)
        .ilike('name', `%${searchTerm}%`)
        .limit(limit),
      supabase
        .from('collections')
        .select(`
          id,
          name,
          description,
          slug,
          user_id,
          user_profiles(username)
        `)
        .ilike('description', `%${searchTerm}%`)
        .limit(limit)
    ])

    if (nameResults.error || descResults.error) {
      console.error('Error searching collections:', nameResults.error || descResults.error)
      return []
    }

    // Combine and deduplicate results
    const combinedData = [...(nameResults.data || []), ...(descResults.data || [])]
    const uniqueData = Array.from(
      new Map(combinedData.map((item: any) => [item.id, item])).values()
    )

    return uniqueData.map((item: any) => ({
      type: 'collection' as const,
      id: item.id,
      title: item.name,
      subtitle: item.description || undefined,
      url: `/u/${item.user_profiles?.username || item.user_id}/c/${item.slug}`,
      metadata: {
        username: item.user_profiles?.username,
        slug: item.slug
      }
    }))
  } catch (error) {
    console.error('Error searching collections:', error)
    return []
  }
}

/**
 * Search users/profiles
 */
export async function searchUsers(query: string, limit: number = 20): Promise<SearchResult[]> {
  const { supabase } = useSupabase()
  if (!supabase) return []

  const searchTerm = query.trim().toLowerCase()
  if (!searchTerm) return []

  try {
    // Search in username and display_name - use separate queries and combine results
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

    // Return all profiles (no privacy filtering since that feature doesn't exist yet)
    return uniqueData.map((item: any) => ({
      type: 'user' as const,
      id: item.id,
      title: item.display_name || item.username || 'Unknown User',
      subtitle: item.username ? `@${item.username}` : undefined,
      url: `/u/${item.username || item.id}`,
      metadata: {
        username: item.username
      }
    }))
  } catch (error) {
    console.error('Error searching users:', error)
    return []
  }
}

/**
 * Search all content types and aggregate results
 */
export async function searchAll(query: string, limitPerType: number = 5): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    const [software, tracks, collections, users] = await Promise.all([
      searchSoftware(query, limitPerType),
      searchTracks(query, limitPerType),
      searchCollections(query, limitPerType),
      searchUsers(query, limitPerType)
    ])

    // Combine and return all results
    return [
      ...software,
      ...tracks,
      ...collections,
      ...users
    ]
  } catch (error) {
    console.error('Error in searchAll:', error)
    return []
  }
}

/**
 * Client-side search for items in an array
 */
export function searchItems<T>(
  items: T[],
  query: string,
  searchFields: (keyof T)[],
  limit?: number
): T[] {
  const searchTerm = query.trim().toLowerCase()
  if (!searchTerm || items.length === 0) return items

  const filtered = items.filter(item => {
    return searchFields.some(field => {
      const value = item[field]
      if (value === null || value === undefined) return false
      
      // Handle array values (like tags, mood)
      if (Array.isArray(value)) {
        return value.some(v => 
          String(v).toLowerCase().includes(searchTerm)
        )
      }
      
      // Handle string values
      return String(value).toLowerCase().includes(searchTerm)
    })
  })

  return limit ? filtered.slice(0, limit) : filtered
}

