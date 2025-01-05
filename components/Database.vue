<template>
  <div class="table w-full relative">
    <div class="table-header-group">
      <div class="table-row">
        <div class="table-cell db-head db-col-lg">Name</div>
        <div class="table-cell db-head db-col-sm">Creator</div>
        <div class="table-cell db-head db-col-sm">Tags</div>
        <div class="table-cell db-head db-col-sm">Price</div>
        <div class="table-cell db-head db-col-sm">OS</div>
        <div class="table-cell db-head db-col-sm">I Use This</div>
        <div class="table-cell db-head db-col-sm">Download</div>
      </div>
    </div>

    <!-- Zero state message -->
    <div v-if="resources.length === 0" class="absolute py-16 w-full text-center">
      <h3 class="text-lg font-medium mb-2">No resources found</h3>
      <p>Try adjusting your filters to see more results</p>
    </div>

    <!-- Resources table -->
    <div v-else v-for="resource in resources" :key="resource.id" class="table-row-group hover:bg-neutral-100 rounded-lg">
      <div 
        class="table-row relative"
        :class="{ 'pending-resource': resource.status === 'pending' }"
      >
       
        <div class="table-cell db-cell relative group">
          <div 
            v-if="canEdit"
            class="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity gap-2"
          >
            <div 
              class="bg-neutral-800 hover:bg-neutral-900 p-2 rounded-md cursor-pointer"
              @click="editResource(resource)"
            >
              <img src="/img/db/icon-edit.svg" alt="Edit" class="size-4" />
            </div>
            <div 
              class="bg-red-600 hover:bg-red-700 p-2 rounded-md cursor-pointer"
              @click="confirmDelete(resource)"
            >
              <img src="/img/db/icon-delete.svg" alt="Delete" class="size-4" />
            </div>
          </div>
          <div class="flex flex-row gap-2 items-center w-fit h-fit">
            <div class="min-w-[111px] max-w-[111px] h-[61px] bg-neutral-200 rounded-md overflow-hidden">
              <img 
                v-if="resource.image_url" 
                :src="getImageUrl(resource.image_url)" 
                :alt="resource.name"
                class="w-full h-full object-cover"
                @error="handleImageError"
              />
            </div>
            <h2>{{ resource.name }}</h2>
          </div>
        </div>
        <div class="table-cell db-cell">
          {{ resource.creator }}
        </div>
        <div class="table-cell db-cell">
          <div class="flex flex-row gap-2 items-center">
            <div v-for="tag in resource.tags" :key="tag" class="tag">
              {{ tag }}
            </div>
          </div>
        </div>
        <div class="table-cell db-cell whitespace-nowrap">
          {{ resource.price }}
        </div>
        <div class="table-cell db-cell">
          <div class="flex flex-row gap-4 items-center">
            <img v-if="resource.os.includes('mac')" src="/img/db/icon-apple.svg" alt="Apple" />
            <img v-if="resource.os.includes('windows')" src="/img/db/icon-windows.svg" alt="Windows" />
            <img v-if="resource.os.includes('linux')" src="/img/db/icon-linux.svg" alt="Linux" />
          </div>
        </div>
        <div class="table-cell db-cell">
          <div class="flex flex-row gap-0 items-stretch rounded-sm overflow-hidden w-fit">
            <div class="flex items-center justify-center bg-neutral-600 text-white p-1 px-2">
              {{ useCounts[resource.id] || 0 }}
            </div>
            <div 
              class="group flex items-center justify-center p-1 px-2 cursor-pointer"
              :class="userUsedResources[resource.id] ? 'bg-neutral-800' : 'bg-neutral-400 hover:bg-neutral-500'"
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
                <div class="w-3 h-3 border-2 border-white rounded-full group-hover:bg-white/50"></div>
              </template>
            </div>
          </div>
        </div>
        <div class="table-cell db-cell">
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
import { useSupabase } from '../utils/supabase'
import { fetchResourcesWithTags, deleteResource, type Resource } from '../utils/resourceQueries'
import { useAuth } from '../composables/useAuth'

interface ResourceFilters {
  price?: { free: boolean; paid: boolean }
  os?: string[]
  tags?: string[]
}

const { supabase } = useSupabase()
const auth = useAuth()
const resources = ref<Resource[]>([])
const currentSort = ref({ sortBy: 'created_at', sortDirection: 'desc' })
const currentFilters = ref<ResourceFilters>({})
const searchQuery = ref('')
const useCounts = ref<{[key: number]: number}>({})
const userUsedResources = ref<{[key: number]: boolean}>({})

const emit = defineEmits(['edit-resource', 'show-signup'])

const editResource = (resource: Resource) => {
  emit('edit-resource', resource)
}

const fetchResources = async () => {
  try {
    const data = await fetchResourcesWithTags()
    
    // Apply search filter first
    let filteredData = data
    if (searchQuery.value) {
      const query = searchQuery.value.trim().toLowerCase()
      filteredData = data.filter(resource => {
        const name = resource.name?.toLowerCase() || ''
        const creator = resource.creator?.toLowerCase() || ''
        const tags = resource.tags?.map(tag => tag.toLowerCase()) || []
        const type = resource.type?.toLowerCase() || ''

        // Split name into words and check if any word starts with the query
        const nameWords = name.split(' ')
        const creatorWords = creator.split(' ')

        return nameWords.some(word => word.startsWith(query)) ||
          creatorWords.some(word => word.startsWith(query)) ||
          tags.some(tag => tag.startsWith(query)) ||
          type.startsWith(query)
      })
    }

    // Then apply filters
    filteredData = filteredData.filter(resource => {
      // Price filter
      if (currentFilters.value.price?.free || currentFilters.value.price?.paid) {
        const price = parseFloat(resource.price.replace('$', ''))
        const isFree = price === 0
        if (currentFilters.value.price?.free && !isFree) return false
        if (currentFilters.value.price?.paid && isFree) return false
      }

      // OS filter
      if (currentFilters.value.os && currentFilters.value.os.length > 0) {
        const hasMatchingOS = currentFilters.value.os.some(osType => 
          resource.os.includes(osType)
        )
        if (!hasMatchingOS) return false
      }

      // Tags filter
      if (currentFilters.value.tags && currentFilters.value.tags.length > 0) {
        const hasAllTags = currentFilters.value.tags.every(tag =>
          resource.tags.includes(tag.toLowerCase())
        )
        if (!hasAllTags) return false
      }

      return true
    })

    // Finally apply sorting
    if (currentSort.value.sortBy === 'price') {
      filteredData.sort((a, b) => {
        const priceA = parseFloat(a.price.replace('$', ''))
        const priceB = parseFloat(b.price.replace('$', ''))
        return currentSort.value.sortDirection === 'asc' 
          ? priceA - priceB 
          : priceB - priceA
      })
    } else {
      filteredData.sort((a, b) => {
        const valueA = a[currentSort.value.sortBy as keyof Resource]
        const valueB = b[currentSort.value.sortBy as keyof Resource]
        if (valueA === undefined || valueB === undefined) return 0
        const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0
        return currentSort.value.sortDirection === 'asc' 
          ? comparison 
          : -comparison
      })
    }

    resources.value = filteredData

  } catch (error) {
    console.error('Error fetching resources:', error)
  }
}

const confirmDelete = async (resource: Resource) => {
  if (confirm('Are you sure you want to delete this resource?')) {
    try {
      await deleteResource(resource.id)
      await fetchResources()
    } catch (error: unknown) {
      console.error('Error deleting resource:', error instanceof Error ? error.message : 'Unknown error')
      alert(`Failed to delete resource: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

const getImageUrl = (url: string) => {
  if (!url) return '/img/placeholder.png'
  
  try {
    // If it's already a full URL, return it
    if (url.startsWith('http')) return url
    
    // Get filename from path
    const path = url.split('/').pop()
    
    // Add https:// to force non-QUIC protocol
    const publicUrl = supabase.storage
      .from('resources')
      .getPublicUrl(`resource-images/${path}`).data.publicUrl
      
    return publicUrl.replace('http://', 'https://')
  } catch (error) {
    console.error('Error getting image URL:', error)
    return '/img/placeholder.png'
  }
}

const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement
  console.error('Image failed to load:', img.src)
  
  // Only set placeholder if not already using it
  if (!img.src.includes('placeholder.png')) {
    img.src = '/img/placeholder.png'
  }
}

const updateSort = (sortParams: typeof currentSort.value) => {
  console.log('Updating sort:', sortParams)
  currentSort.value = sortParams
  fetchResources()
}

const updateFiltersAndSort = (params: { sort: typeof currentSort.value, filters: any }) => {
  console.log('Updating filters and sort:', params)
  currentSort.value = params.sort
  currentFilters.value = params.filters
  fetchResources()
}

const handleSearch = (query: string) => {
  searchQuery.value = query
  fetchResources()
}

// Watch for user login to refresh use counts
watch(() => auth.user.value, async (newUser, oldUser) => {
  console.log('User changed:', { 
    hadUser: !!oldUser, 
    hasUser: !!newUser,
    userId: newUser?.id
  })
  if (newUser) {
    await fetchUseCounts()
  } else {
    // Reset states when user logs out
    useCounts.value = {}
    userUsedResources.value = {}
  }
}, { immediate: true })

const toggleUse = async (resource: Resource) => {
  console.log('Toggle Use clicked for:', resource.name)
  console.log('Current user:', auth.user.value)
  console.log('Current state:', {
    isUsed: userUsedResources.value[resource.id],
    currentCount: useCounts.value[resource.id] || 0
  })

  if (!auth.user.value) {
    console.log('No user logged in, showing signup modal')
    emit('show-signup')
    return
  }

  try {
    const wasMarked = await auth.markResourceAsUsed(resource.id)
    console.log('Toggle result:', wasMarked ? 'Marked as used' : 'Unmarked')
    
    // Update local state based on the result
    userUsedResources.value[resource.id] = wasMarked
    useCounts.value[resource.id] = (useCounts.value[resource.id] || 0) + (wasMarked ? 1 : -1)
    
    console.log('Updated state:', {
      resource: resource.name,
      isUsed: wasMarked,
      newCount: useCounts.value[resource.id]
    })
  } catch (error) {
    console.error('Error toggling resource use:', error)
  }
}

const fetchUseCounts = async () => {
  console.log('Fetching use counts...')
  try {
    // Get all resource_ids first
    const { data: resourceIds, error: resourceError } = await supabase
      .from('resources')
      .select('id')

    if (resourceError) throw resourceError

    // Initialize counts
    const counts: {[key: number]: number} = {}
    
    // Get counts for each resource
    await Promise.all(resourceIds?.map(async ({ id }) => {
      const { count, error } = await supabase
        .from('user_resources')
        .select('*', { count: 'exact', head: true })
        .eq('resource_id', id)

      if (error) throw error
      counts[id] = count || 0
    }) || [])

    // If user is logged in, get their specific usage
    const userUsed: {[key: number]: boolean} = {}
    if (auth.user.value) {
      const { data: userData, error: userError } = await supabase
        .from('user_resources')
        .select('resource_id')
        .eq('user_id', auth.user.value.id)
      
      if (userError) throw userError

      userData?.forEach((row: { resource_id: number }) => {
        userUsed[row.resource_id] = true
      })
    }

    console.log('Updated use counts:', counts)
    console.log('Updated user used states:', userUsed)
    console.log('Current user ID:', auth.user.value?.id)

    useCounts.value = counts
    userUsedResources.value = userUsed
  } catch (error: any) {
    console.error('Error fetching use counts:', error)
  }
}

const props = defineProps({
  canEdit: {
    type: Boolean,
    default: false
  }
})

// Add this to verify the prop is being received
watch(() => props.canEdit, (newValue) => {
  console.log('Database canEdit changed:', newValue)
})

onMounted(async () => {
  console.log('Database mounted with canEdit:', props.canEdit)
  await fetchResources()
  await fetchUseCounts() // Always fetch counts on mount
})

defineExpose({
  fetchResources,
  updateFiltersAndSort,
  handleSearch
})
</script>

<style>
.pending-resource {
  @apply relative;  /* For the pending badge positioning */
}

/* You can add any other pending-specific styles here */
</style>