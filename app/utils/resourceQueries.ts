import { useSupabase } from './supabase'
import { useAuth } from '~/composables/useAuth'

export interface ResourceType {
  id: number
  slug: string
  display_name: string
  created_at: string
}

export interface Resource {
  id: number
  name: string
  slug?: string
  creator: string
  creator_id?: number
  price: string
  link: string
  image_url?: string
  os: string[]
  type_id: number
  type?: ResourceType
  tags: string[]
  created_at: string
  owner_id?: string
  submitted_by?: string
  status?: 'pending' | 'approved' | 'rejected'
}

export interface UserProfile {
  id: string
  username: string
  display_name: string
  bio: string
  website: string
  avatar_url: string
  user_type: 'creator' | 'audio_pro'
  social_links: {
    twitter?: string
    instagram?: string
    soundcloud?: string
    spotify?: string
    youtube?: string
    [key: string]: string | undefined
  }
  created_at: string
  updated_at: string
}

interface Creator {
  id: number
  name: string
  contact_info?: string
}

interface Tag {
  id: number
  name: string
}

interface ResourceWithTags extends Resource {
  resource_tags?: { tags: { name: string } }[]
}

interface ResourceUsageRecord {
  resource_id: number
  used_at: string
  resources: ResourceWithTags
}

interface ResourceCollectionRecord {
  resource_id: number
  created_at: string
  resources: ResourceWithTags
}

export const fetchResourcesWithTags = async (): Promise<Resource[]> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    console.error('Supabase client not initialized')
    return []
  }

  try {
    // Fetch resources with their tags, creator, and type
    const { data: resources, error } = await supabase
      .from('resources')
      .select(`
        *,
        creators (
          name,
          contact_info
        ),
        resource_tags (
          tag_id,
          tags (
            name
          )
        ),
        resource_types (
          id,
          slug,
          display_name
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to include tags array, creator name, and type
    const transformedResources = resources.map((resource: any) => ({
      ...resource,
      creator: resource.creators?.name || 'Unknown',
      tags: resource.resource_tags?.map((rt: any) => rt.tags.name) || [],
      type: resource.resource_types
    }))
    return transformedResources
  } catch (error) {
    console.error('Error fetching resources:', error)
    return []
  }
}

// Fetch all available resource types
export const fetchResourceTypes = async (): Promise<ResourceType[]> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { data, error } = await supabase
      .from('resource_types')
      .select('*')
      .order('display_name') as { data: ResourceType[] | null, error: any }

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching resource types:', error)
    return []
  }
}

// Function to add a new resource with tags
export const createResourceWithTags = async (resource: Partial<Resource>, tags: string[]) => {
  const { supabase } = useSupabase()
  const auth = useAuth()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // Get current user's ID from Supabase auth
    const currentUser = auth.user.value
    
    if (!currentUser?.id) throw new Error('Must be logged in to create a resource')

    // 1. Insert the resource
    const resourceData = {
      name: resource.name,
      creator_id: resource.creator_id,
      price: resource.price,
      link: resource.link,
      image_url: resource.image_url,
      os: resource.os,
      type_id: resource.type_id,
      owner_id: currentUser.id,
      submitted_by: currentUser.id,
      status: 'pending'
    }

    const { data: newResource, error: resourceError } = await supabase
      .from('resources')
      .insert([resourceData])
      .select(`
        *,
        resource_types (
          id,
          slug,
          display_name
        )
      `)
      .single()

    if (resourceError) {
      console.error('Resource insert error:', resourceError)
      throw resourceError
    }
    if (!newResource) throw new Error('Failed to create resource')

    // 2. For each tag, ensure it exists in the tags table
    const tagPromises = tags.map(async (tagName) => {
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .upsert({ name: tagName.toLowerCase() }, { onConflict: 'name' })
        .select()
        .single() as { data: Tag | null, error: any }

      if (tagError) throw tagError
      if (!tag) throw new Error(`Failed to create/get tag: ${tagName}`)
      return tag
    })

    const resolvedTags = await Promise.all(tagPromises)

    // 3. Create the resource_tags relationships
    const resourceTagsData = resolvedTags.map(tag => ({
      resource_id: newResource.id,
      tag_id: tag.id
    }))

    const { error: relationError } = await supabase
      .from('resource_tags')
      .insert(resourceTagsData)

    if (relationError) throw relationError

    return newResource

  } catch (error) {
    console.error('Error creating resource with tags:', error)
    throw error
  }
}

// Function to delete a resource and its tag relationships
export const deleteResource = async (resourceId: number): Promise<boolean> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting resource:', error)
    throw error
  }
}

// Add function to get user profile
export const getUser = async (userId: string): Promise<UserProfile | null> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single() as { data: UserProfile | null, error: any }

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

// Add function to update user profile
export const updateUser = async (userProfile: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update(userProfile)
      .eq('id', userProfile.id)
      .select()
      .single() as { data: UserProfile | null, error: any }

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user:', error)
    return null
  }
}

// Record that a user has used a resource
export const recordResourceUsage = async (resourceId: number): Promise<boolean> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { error } = await supabase
      .from('user_resources')
      .insert([{
        resource_id: resourceId,
        used_at: new Date().toISOString()
      }])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error recording resource usage:', error)
    return false
  }
}

// Get a user's resource usage history
export const getUserResourceHistory = async (): Promise<Resource[]> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { data, error } = await supabase
      .from('user_resources')
      .select(`
        resource_id,
        used_at,
        resources (
          *,
          resource_tags (
            tags (
              name
            )
          )
        )
      `)
      .order('used_at', { ascending: false }) as { data: ResourceUsageRecord[] | null, error: any }

    if (error) throw error
    if (!data) return []

    // Transform the data to match the Resource interface
    return data.map(item => ({
      ...item.resources,
      tags: item.resources.resource_tags?.map(rt => rt.tags.name) || [],
      last_used: item.used_at
    })) as Resource[]
  } catch (error) {
    console.error('Error fetching user resource history:', error)
    return []
  }
}

// Add/remove resource from user's collection
export const toggleResourceCollection = async (resourceId: number): Promise<boolean> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // Check if resource is already in collection
    const { data: existing } = await supabase
      .from('user_collections')
      .select('*')
      .eq('resource_id', resourceId)
      .single()

    if (existing) {
      // Remove from collection
      const { error } = await supabase
        .from('user_collections')
        .delete()
        .eq('resource_id', resourceId)

      if (error) throw error
    } else {
      // Add to collection
      const { error } = await supabase
        .from('user_collections')
        .insert([{ resource_id: resourceId }])

      if (error) throw error
    }

    return true
  } catch (error) {
    console.error('Error toggling resource collection:', error)
    return false
  }
}

// Get user's collected resources
export const getUserCollection = async (): Promise<Resource[]> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { data, error } = await supabase
      .from('user_collections')
      .select(`
        resource_id,
        created_at,
        resources (
          *,
          resource_tags (
            tags (
              name
            )
          )
        )
      `)
      .order('created_at', { ascending: false }) as { data: ResourceCollectionRecord[] | null, error: any }

    if (error) throw error
    if (!data) return []

    return data.map(item => ({
      ...item.resources,
      tags: item.resources.resource_tags?.map(rt => rt.tags.name) || [],
      collected_at: item.created_at
    })) as Resource[]
  } catch (error) {
    console.error('Error fetching user collection:', error)
    return []
  }
}

// Fetch a resource by slug
export const fetchResourceBySlug = async (slug: string, typeSlug?: string): Promise<Resource | null> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    let query = supabase
      .from('resources')
      .select(`
        id,
        name,
        slug,
        price,
        link,
        image_url,
        os,
        status,
        created_at,
        type_id,
        creator:creators(id, name),
        type:resource_types(id, slug, display_name),
        resource_tags(
          tags(name)
        )
      `)
      .eq('slug', slug)
      .eq('status', 'approved')
    
    // Filter by type if specified
    if (typeSlug) {
      const { data: typeData, error: typeError } = await supabase
        .from('resource_types')
        .select('id')
        .eq('slug', typeSlug)
        .single()
      
      if (typeError || !typeData) {
        return null
      }
      
      query = query.eq('type_id', typeData.id)
    }
    
    const { data, error } = await query.single()
    
    if (error || !data) return null
    
    // Transform the data to match Resource interface
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      creator: data.creator?.name || 'Unknown',
      creator_id: data.creator?.id,
      price: data.price,
      link: data.link,
      image_url: data.image_url,
      os: data.os || [],
      type_id: data.type_id,
      type: data.type,
      tags: data.resource_tags?.map((rt: any) => rt.tags?.name).filter(Boolean) || [],
      created_at: data.created_at,
      status: data.status
    } as Resource
  } catch (error) {
    console.error('Error fetching resource by slug:', error)
    return null
  }
}

// Fetch comments for a resource
export const fetchResourceComments = async (resourceId: number): Promise<any[]> => {
  const { supabase } = useSupabase()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // 1) Fetch comments (without join to avoid FK/400 issues)
    const { data: commentsData, error: commentsError } = await supabase
      .from('resource_comments')
      .select('id, resource_id, user_id, content, created_at, updated_at')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: true })
    
    if (commentsError) throw commentsError
    const comments = commentsData || []

    // 2) Batch-fetch user profiles for unique user_ids
    const uniqueUserIds = Array.from(new Set(comments.map(c => c.user_id).filter(Boolean)))
    let profilesById: Record<string, { username: string; display_name: string | null }> = {}
    if (uniqueUserIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .in('id', uniqueUserIds as string[])
      profilesById = (profilesData || []).reduce((acc: any, p: any) => {
        acc[p.id] = { username: p.username, display_name: p.display_name }
        return acc
      }, {} as Record<string, { username: string; display_name: string | null }>)
    }

    // 3) Merge profiles into comments
    return comments.map((comment: any) => ({
      id: comment.id,
      resource_id: comment.resource_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user: profilesById[comment.user_id]
        ? {
            username: profilesById[comment.user_id].username,
            display_name: profilesById[comment.user_id].display_name || undefined
          }
        : undefined
    }))
  } catch (error) {
    console.error('Error fetching resource comments:', error)
    return []
  }
}

// Create a comment on a resource
export const createResourceComment = async (resourceId: number, content: string): Promise<any | null> => {
  const { supabase } = useSupabase()
  const auth = useAuth()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  
  if (!auth.user.value) {
    throw new Error('Must be logged in to create a comment')
  }

  try {
    // 1) Insert comment (no join)
    const { data, error } = await supabase
      .from('resource_comments')
      .insert([{
        resource_id: resourceId,
        user_id: auth.user.value.id,
        content: content.trim()
      }])
      .select('id, resource_id, user_id, content, created_at, updated_at')
      .single()
    
    if (error) throw error
    if (!data) return null

    // 2) Fetch author profile (lightweight)
    let userProfile: { username: string; display_name: string | null } | undefined
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('username, display_name')
      .eq('id', data.user_id)
      .single()
    if (profileData) {
      userProfile = { username: profileData.username, display_name: profileData.display_name }
    }

    return {
      id: data.id,
      resource_id: data.resource_id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user: userProfile
        ? { username: userProfile.username, display_name: userProfile.display_name || undefined }
        : undefined
    }
  } catch (error) {
    console.error('Error creating resource comment:', error)
    throw error
  }
}

// Toggle resource use (add/remove from user_resources)
export const toggleResourceUse = async (resourceId: number): Promise<{ isUsing: boolean; count: number }> => {
  const { supabase } = useSupabase()
  const auth = useAuth()
  
  if (!supabase || !auth.user.value) {
    throw new Error('Must be logged in to toggle resource use')
  }

  try {
    // Check if user is already using this resource
    const { data: existing, error: checkError } = await supabase
      .from('user_resources')
      .select('resource_id')
      .eq('resource_id', resourceId)
      .eq('user_id', auth.user.value.id)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }
    
    if (existing) {
      // Remove use
      const { error: deleteError } = await supabase
        .from('user_resources')
        .delete()
        .eq('resource_id', resourceId)
        .eq('user_id', auth.user.value.id)
      
      if (deleteError) throw deleteError
    } else {
      // Add use
      const { error: insertError } = await supabase
        .from('user_resources')
        .insert({
          user_id: auth.user.value.id,
          resource_id: resourceId,
          used_at: new Date().toISOString()
        })
      
      if (insertError) throw insertError
    }
    
    // Get updated count
    const { data: countData, error: countError } = await supabase
      .rpc('get_resource_use_counts')
    
    if (countError) throw countError
    
    const count = countData?.find((item: any) => item.resource_id === resourceId)?.count || 0
    
    return {
      isUsing: !existing,
      count: parseInt(count) || 0
    }
  } catch (error) {
    console.error('Error toggling resource use:', error)
    throw error
  }
}

// Get resource use count and user's usage status
export const getResourceUseStatus = async (resourceId: number): Promise<{ count: number; isUsing: boolean }> => {
  const { supabase } = useSupabase()
  const auth = useAuth()
  
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // Get total count
    const { data: countData, error: countError } = await supabase
      .rpc('get_resource_use_counts')
    
    if (countError) throw countError
    
    const count = countData?.find((item: any) => item.resource_id === resourceId)?.count || 0
    
    // Get user's usage status if logged in
    let isUsing = false
    if (auth.user.value) {
      const { data: userUse, error: userError } = await supabase
        .from('user_resources')
        .select('resource_id')
        .eq('resource_id', resourceId)
        .eq('user_id', auth.user.value.id)
        .single()
      
      if (!userError && userUse) {
        isUsing = true
      }
    }
    
    return {
      count: parseInt(count) || 0,
      isUsing
    }
  } catch (error) {
    console.error('Error getting resource use status:', error)
    return { count: 0, isUsing: false }
  }
} 