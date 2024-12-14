import { useSupabase } from './supabase'

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
}

export const fetchResourcesWithTags = async (): Promise<Resource[]> => {
  const { supabase } = useSupabase()
  
  try {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        resource_tags (
          tags (
            name
          )
        )
      `)
      .eq('type', 'software')

    if (error) throw error

    // Transform the data to ensure tags are in the expected format
    return data.map(resource => ({
      ...resource,
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
  
  try {
    // 1. Insert the resource first
    const { data: newResource, error: resourceError } = await supabase
      .from('resources')
      .insert([{
        name: resource.name,
        creator: resource.creator,
        price: resource.price,
        link: resource.link,
        image_url: resource.image_url,
        os: resource.os,
        type: 'software'
      }])
      .select()
      .single()

    if (resourceError) throw resourceError

    // 2. For each tag, ensure it exists in the tags table and get its ID
    const tagPromises = tags.map(async (tagName) => {
      // Try to insert the tag, if it exists it will return the existing tag
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