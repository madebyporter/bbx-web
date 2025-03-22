<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
      class="relative border border-neutral-800 p-4 rounded-lg"
      :class="{ 'pending-resource': resource.status === 'pending' }"
    >
      <!-- Resource Image -->
      <div class="w-full aspect-square bg-neutral-200 rounded-md overflow-hidden mb-4">
        <img 
          v-if="resource.image_url" 
          :src="getImageUrl(resource.image_url)" 
          :alt="resource.name"
          class="w-full h-full object-cover"
          @error="handleImageError"
        />
      </div>

      <!-- Resource Info -->
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="text-lg font-medium">{{ resource.name }}</h2>
          <div class="flex items-center gap-2 text-sm text-neutral-400">
            <span>{{ resource.creator }}</span>
            <span>•</span>
            <span>{{ resource.price }}</span>
          </div>
        </div>

        <!-- Tags -->
        <div class="flex flex-wrap gap-2">
          <div v-for="tag in resource.tags" :key="tag" class="tag">
            {{ tag }}
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
          <div class="flex flex-row gap-4 items-center">
            <!-- OS Icons -->
            <div class="flex gap-4 items-center">
              <div v-if="resource.os.includes('mac')">
                <svg width="12" height="15" viewBox="0 0 12 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path class="fill-white" d="M9.9375 7.40984C9.9375 7.47234 9.84375 9.31609 11.875 10.2848C11.5 11.4411 10.1875 14.0036 8.65625 14.0036C7.78125 14.0036 7.28125 13.4411 6.28125 13.4411C5.25 13.4411 4.6875 14.0036 3.90625 14.0036C2.40625 14.0661 0.96875 11.2536 0.5625 10.0973C0.25 9.22234 0.125 8.37859 0.125 7.56609C0.125 4.78484 1.96875 3.44109 3.71875 3.40984C4.5625 3.40984 5.625 4.00359 6.09375 4.00359C6.53125 4.00359 7.75 3.28484 8.875 3.37859C10.0312 3.47234 10.9062 3.90984 11.5 4.75359C10.4688 5.40984 9.9375 6.25359 9.9375 7.40984ZM8.1875 2.28484C7.5625 3.00359 6.8125 3.40984 6 3.34734C5.9375 2.50359 6.25 1.72234 6.8125 1.09734C7.3125 0.534843 8.1875 0.0660934 8.9375 0.00359344C8.9375 0.347343 9.03125 1.28484 8.1875 2.28484Z" />
                </svg>
              </div>
              <div v-if="resource.os.includes('windows')">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path class="fill-white" d="M0 1.94109V6.69109H5.71875V1.15984L0 1.94109ZM0 12.0973V7.40984H5.71875V12.8786L0 12.0973ZM6.34375 12.9723V7.40984H14V14.0036L6.34375 12.9723ZM6.34375 1.06609L14 0.00359344V6.69109H6.34375V1.06609Z" fill="black"/>
                </svg>
              </div>
            </div>
            <a :href="resource.link" target="_blank" class="btn">
              Download
            </a>
          </div>
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
    const data = await fetchResourcesWithTags()
    
    // Filter by type if specified
    let filteredData = data
    if (props.type) {
      filteredData = data.filter(resource => {
        const resourceType = resource.type as ResourceType
        return resourceType?.slug === props.type
      })
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
    // Get all user_resources entries for the relevant resource_ids
    const { data: userResourceEntries, error: entriesError } = await supabase
      .from('user_resources')
      .select('resource_id')
      .in('resource_id', resources.value.map(r => r.id)) as { 
        data: { resource_id: number }[] | null, 
        error: any 
      }

    if (entriesError) throw entriesError

    // Count occurrences of each resource_id
    const counts = userResourceEntries?.reduce((acc: {[key: number]: number}, entry) => {
      acc[entry.resource_id] = (acc[entry.resource_id] || 0) + 1
      return acc
    }, {})

    useCounts.value = counts || {}

    // Get current user's used resources
    const userId = auth.user?.value?.id
    if (userId) {
      const { data: userUses, error: usesError } = await supabase
        .from('user_resources')
        .select('resource_id')
        .eq('user_id', userId)
        .in('resource_id', resources.value.map(r => r.id)) as {
          data: { resource_id: number }[] | null,
          error: any
        }

      if (usesError) throw usesError

      userUsedResources.value = (userUses || []).reduce((acc: {[key: number]: boolean}, curr) => {
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
  if (supabase) {
    await fetchResources()
  } else {
  }
})

// Watch for auth changes
watch(() => auth.user, async () => {
  await fetchUseCounts()
})
</script> 