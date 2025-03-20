<template>
  <div class="grid grid-cols-3 gap-4">
    <!-- Zero state message -->
    <div v-if="resources.length === 0" class="col-span-3 py-16 w-full text-center">
      <h3 class="text-lg font-medium mb-2">No resources found</h3>
      <p>Try adjusting your filters to see more results</p>
    </div>

    <!-- Resources grid -->
    <div 
      v-else 
      v-for="resource in resources" 
      :key="resource.id" 
      class="relative hover:ring-1 hover:ring-neutral-800 hover:bg-neutral-800/5 p-4 rounded-lg"
      :class="{ 'pending-resource': resource.status === 'pending' }"
    >
      <!-- Resource Image -->
      <div class="w-full aspect-video bg-neutral-200 rounded-md overflow-hidden mb-4">
        <img 
          v-if="resource.image_url" 
          :src="getImageUrl(resource.image_url)" 
          :alt="resource.name"
          class="w-full h-full object-cover"
          @error="handleImageError"
        />
      </div>

      <!-- Resource Info -->
      <div class="space-y-2">
        <h2 class="text-lg font-medium">{{ resource.name }}</h2>
        
        <div class="flex items-center gap-2 text-sm text-neutral-400">
          <span>{{ resource.creator }}</span>
          <span>•</span>
          <span>{{ resource.price }}</span>
        </div>

        <!-- Tags -->
        <div class="flex flex-wrap gap-2">
          <div v-for="tag in resource.tags" :key="tag" class="tag">
            {{ tag }}
          </div>
        </div>

        <!-- OS Icons -->
        <div class="flex gap-4 items-center">
          <div v-if="resource.os.includes('mac')">
            <IconApple />
          </div>
          <div v-if="resource.os.includes('windows')">
            <IconWindows />
          </div>
          <div v-if="resource.os.includes('linux')">
            <IconLinux />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-between items-center mt-4">
          <!-- I Use This -->
          <div class="group flex flex-row gap-0 items-stretch rounded-sm overflow-hidden w-fit border border-neutral-800 hover:border-neutral-700">
            <div class="flex items-center justify-center bg-transparent text-white p-1 px-2">
              {{ useCounts[resource.id] || 0 }}
            </div>
            <div 
              class="group flex items-center justify-center p-1 px-2 cursor-pointer"
              :class="userUsedResources[resource.id] ? 'bg-transparent' : 'bg-transparent hover:bg-transparent'"
              @click="toggleUse(resource)"
            >
              <template v-if="userUsedResources[resource.id]">
                <img 
                  src="/img/db/icon-check.svg" 
                  alt="Remove from I Use This" 
                  class="min-w-3 min-h-auto" 
                />
              </template>
              <template v-else>
                <div class="w-3 h-3 border-1 border-neutral-800 rounded-full group-hover:border-neutral-700 hover:bg-neutral-700"></div>
              </template>
            </div>
          </div>

          <!-- Download Button -->
          <a :href="resource.link" target="_blank" class="btn">
            Download
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { fetchResourcesWithTags, type Resource, type ResourceType } from '~/utils/resourceQueries'
import { useAuth } from '~/composables/useAuth'

interface Props {
  type?: string
  canEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: undefined,
  canEdit: false
})

const { supabase } = useSupabase()
const auth = useAuth()
const resources = ref<Resource[]>([])
const useCounts = ref<{[key: number]: number}>({})
const userUsedResources = ref<{[key: number]: boolean}>({})

interface ResourceUseCount {
  resource_id: number
  count: string
}

interface UserResource {
  resource_id: number
}

const fetchResources = async () => {
  if (!supabase) {
    console.error('DatabaseGrid: Supabase client not initialized')
    return
  }

  try {
    console.log('DatabaseGrid: Fetching resources...')
    const data = await fetchResourcesWithTags()
    console.log('DatabaseGrid: Fetched', data.length, 'resources')
    
    // Filter by type if specified
    let filteredData = data
    if (props.type) {
      filteredData = data.filter(resource => {
        const resourceType = resource.type as ResourceType
        return resourceType?.slug === props.type
      })
      console.log(`DatabaseGrid: Filtered to ${filteredData.length} resources of type ${props.type}`)
    }

    resources.value = filteredData
    await fetchUseCounts()
  } catch (error) {
    console.error('Error fetching resources:', error)
  }
}

const fetchUseCounts = async () => {
  if (!supabase || !resources.value.length) return

  try {
    // Get use counts for all resources
    const { data: counts, error: countsError } = await supabase
      .from('user_resources')
      .select('resource_id, count(*)')
      .in('resource_id', resources.value.map(r => r.id))
      .group('resource_id') as { data: ResourceUseCount[] | null, error: any }

    if (countsError) throw countsError

    // Convert to object for easy lookup
    useCounts.value = (counts || []).reduce((acc: {[key: number]: number}, curr: ResourceUseCount) => {
      acc[curr.resource_id] = parseInt(curr.count)
      return acc
    }, {})

    // Get current user's used resources
    const userId = auth.user?.value?.id
    if (userId) {
      const { data: userUses, error: usesError } = await supabase
        .from('user_resources')
        .select('resource_id')
        .eq('user_id', userId)
        .in('resource_id', resources.value.map(r => r.id)) as { data: UserResource[] | null, error: any }

      if (usesError) throw usesError

      userUsedResources.value = (userUses || []).reduce((acc: {[key: number]: boolean}, curr: UserResource) => {
        acc[curr.resource_id] = true
        return acc
      }, {})
    }
  } catch (error) {
    console.error('Error fetching use counts:', error)
  }
}

const toggleUse = async (resource: Resource) => {
  const userId = auth.user?.value?.id
  if (!supabase || !userId) return

  try {
    if (userUsedResources.value[resource.id]) {
      // Remove use
      const { error } = await supabase
        .from('user_resources')
        .delete()
        .eq('user_id', userId)
        .eq('resource_id', resource.id)

      if (error) throw error

      userUsedResources.value[resource.id] = false
      useCounts.value[resource.id] = (useCounts.value[resource.id] || 1) - 1
    } else {
      // Add use
      const { error } = await supabase
        .from('user_resources')
        .insert({
          user_id: userId,
          resource_id: resource.id,
          used_at: new Date().toISOString()
        })

      if (error) throw error

      userUsedResources.value[resource.id] = true
      useCounts.value[resource.id] = (useCounts.value[resource.id] || 0) + 1
    }
  } catch (error) {
    console.error('Error toggling resource use:', error)
  }
}

const getImageUrl = (url: string) => {
  return url.startsWith('http') ? url : `https://storage.googleapis.com/bbx-resources/${url}`
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/img/db/placeholder.png'
}

// Initialize
onMounted(async () => {
  console.log('DatabaseGrid: Component mounted')
  if (supabase) {
    console.log('DatabaseGrid: Supabase client is ready')
    await fetchResources()
  } else {
    console.log('DatabaseGrid: Waiting for Supabase client...')
  }
})

// Watch for auth changes
watch(() => auth.user, async () => {
  await fetchUseCounts()
})
</script> 