import { useSupabase } from './supabase'
import { useNuxtApp } from '#app'

export interface Resource {
  id: number
  name: string
  creator: string
  price: string
  link: string
  image_url: string
  os: string[]
  type: string
  tags: string[]
  created_at: string
  owner_id: string
  is_public: boolean
  status?: 'pending' | 'approved' | 'rejected'
}

export interface User {
  id: string
  username: string
  display_name: string
  bio: string
  website: string
  avatar_url: string
  user_type: 'producer' | 'engineer' | 'writer' | 'performer' | 'other'
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

export const fetchResourcesWithTags = async (): Promise<Resource[]> => {
  const { supabase } = useSupabase()
  const { $identity } = useNuxtApp()
  
  try {
    // Get current user to check if admin
    const currentUser = $identity.currentUser()
    const isAdmin = currentUser?.app_metadata?.roles?.includes('admin')

    // Build query based on user role
    let query = supabase
      .from('resources')
      .select(`
        *,
        creators (name),
        resource_tags (
          tags (
            name
          )
        )
      `)
      .eq('type', 'software')

    // If not admin, only show approved resources
    if (!isAdmin) {
      query = query.eq('status', 'approved')
    }

    const { data, error } = await query

    if (error) throw error

    // Transform the data to ensure tags are in the expected format
    return data.map(resource => ({
      ...resource,
      creator: resource.creators.name,
      tags: resource.resource_tags?.map(rt => rt.tags.name) || []
    }))

  } catch (error) {
    console.error('Error fetching resources:', error)
    throw error
  }
}

// Function to add a new resource with tags
export const createResourceWithTags = async (resource: Partial<Resource>, tags: string[]) => {
  const { supabase } = useSupabase()
  const { $identity } = useNuxtApp()
  
  try {
    // Get current user's ID from Netlify Identity
    const currentUser = $identity.currentUser()
    console.log('Current Netlify User:', currentUser)
    
    if (!currentUser) throw new Error('Must be logged in to create a resource')

    // First, create or get the creator
    const { data: creatorData, error: creatorError } = await supabase
      .from('creators')
      .upsert([{ name: resource.creator }], { onConflict: 'name' })
      .select()
      .single()

    if (creatorError) throw creatorError

    // 1. Insert the resource with creator_id
    const resourceData = {
      name: resource.name,
      creator_id: creatorData.id,
      price: resource.price,
      link: resource.link,
      image_url: resource.image_url,
      os: resource.os,
      type: 'software',
      owner_id: currentUser.id,
      submitted_by: currentUser.id,
      status: 'pending'
    }
    
    console.log('Attempting to insert resource with data:', resourceData)

    const { data: newResource, error: resourceError } = await supabase
      .from('resources')
      .insert([resourceData])
      .select()
      .single()

    if (resourceError) {
      console.error('Resource insert error:', resourceError)
      throw resourceError
    }

    console.log('Successfully created resource:', newResource)

    // 2. For each tag, ensure it exists in the tags table
    const tagPromises = tags.map(async (tagName) => {
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .upsert({ name: tagName.toLowerCase() }, { onConflict: 'name' })
        .select()
        .single()

      if (tagError) throw tagError
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
export const deleteResource = async (resourceId: number) => {
  const { supabase } = useSupabase()
  
  try {
    // Delete image from storage if it exists
    const { data: resource } = await supabase
      .from('resources')
      .select('image_url')
      .eq('id', resourceId)
      .single()

    if (resource?.image_url) {
      const oldPath = resource.image_url.split('/').pop()
      if (oldPath) {
        const { error: storageError } = await supabase.storage
          .from('resources')
          .remove([`resource-images/${oldPath}`])
        
        if (storageError) {
          console.error('Storage delete error:', storageError)
        }
      }
    }

    // The resource_tags entries will be automatically deleted due to ON DELETE CASCADE
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId)

    if (error) throw error

  } catch (error) {
    console.error('Error deleting resource:', error)
    throw error
  }
}

// Add function to get user profile
export const getUser = async (userId: string): Promise<User | null> => {
  const { supabase } = useSupabase()
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

// Add function to update user profile
export const updateUser = async (user: Partial<User>): Promise<User | null> => {
  const { supabase } = useSupabase()
  
  try {
    const { data, error } = await supabase
      .from('users')
      .update(user)
      .eq('id', user.id)
      .select()
      .single()

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
      .order('used_at', { ascending: false })

    if (error) throw error

    // Transform the data to match the Resource interface
    return data.map(item => ({
      ...item.resources,
      tags: item.resources.resource_tags?.map(rt => rt.tags.name) || [],
      last_used: item.used_at
    }))
  } catch (error) {
    console.error('Error fetching user resource history:', error)
    return []
  }
}

// Add/remove resource from user's collection
export const toggleResourceCollection = async (resourceId: number): Promise<boolean> => {
  const { supabase } = useSupabase()
  
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
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(item => ({
      ...item.resources,
      tags: item.resources.resource_tags?.map(rt => rt.tags.name) || [],
      collected_at: item.created_at
    }))
  } catch (error) {
    console.error('Error fetching user collection:', error)
    return []
  }
} 