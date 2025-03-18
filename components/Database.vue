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
    <div v-else v-for="resource in resources" :key="resource.id" class="table-row-group hover:ring-1 hover:ring-stone-800 hover:bg-stone-800/5">
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
              class="bg-neutral-800 hover:bg-stone-900 p-2 rounded-md cursor-pointer"
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
            <div class="min-w-[111px] max-w-[111px] h-[61px] bg-stone-200 rounded-md overflow-hidden">
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
            <div v-if="resource.os.includes('mac')">
              <svg width="12" height="15" viewBox="0 0 12 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="fill-stone-700" d="M9.9375 7.40984C9.9375 7.47234 9.84375 9.31609 11.875 10.2848C11.5 11.4411 10.1875 14.0036 8.65625 14.0036C7.78125 14.0036 7.28125 13.4411 6.28125 13.4411C5.25 13.4411 4.6875 14.0036 3.90625 14.0036C2.40625 14.0661 0.96875 11.2536 0.5625 10.0973C0.25 9.22234 0.125 8.37859 0.125 7.56609C0.125 4.78484 1.96875 3.44109 3.71875 3.40984C4.5625 3.40984 5.625 4.00359 6.09375 4.00359C6.53125 4.00359 7.75 3.28484 8.875 3.37859C10.0312 3.47234 10.9062 3.90984 11.5 4.75359C10.4688 5.40984 9.9375 6.25359 9.9375 7.40984ZM8.1875 2.28484C7.5625 3.00359 6.8125 3.40984 6 3.34734C5.9375 2.50359 6.25 1.72234 6.8125 1.09734C7.3125 0.534843 8.1875 0.0660934 8.9375 0.00359344C8.9375 0.347343 9.03125 1.28484 8.1875 2.28484Z" />
              </svg>
            </div>
            <div v-if="resource.os.includes('windows')">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="fill-stone-700" d="M0 1.94109V6.69109H5.71875V1.15984L0 1.94109ZM0 12.0973V7.40984H5.71875V12.8786L0 12.0973ZM6.34375 12.9723V7.40984H14V14.0036L6.34375 12.9723ZM6.34375 1.06609L14 0.00359344V6.69109H6.34375V1.06609Z" />
              </svg>
            </div>
          </div>
        </div>
        <!-- I Use This -->
        <div class="table-cell db-cell">
          <div class="group flex flex-row gap-0 items-stretch rounded-sm overflow-hidden w-fit border border-stone-800 hover:border-stone-700">
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
                <div class="w-3 h-3 border-1 border-stone-800 rounded-full group-hover:border-stone-700 hover:bg-stone-700"></div>
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
const isSupabaseReady = ref(false)

// Add initialization check
watch(() => supabase, (newSupabase) => {
  if (newSupabase) {
    isSupabaseReady.value = true
    console.log('Supabase client is ready')
  }
}, { immediate: true })

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

const fetchUseCounts = async () => {
  console.log('Fetching use counts...')
  try {
    if (!isSupabaseReady.value || !supabase) {
      console.log('Waiting for Supabase to be ready...')
      return
    }

    // Get total counts for all resources (public data)
    const { data: resourceCounts, error: countError } = await supabase
      .rpc('get_resource_use_counts')

    if (countError) throw countError

    // Transform array of counts into object
    const counts: {[key: number]: number} = {}
    if (resourceCounts && Array.isArray(resourceCounts)) {
      resourceCounts.forEach((row: { resource_id: number; use_count: number }) => {
        counts[row.resource_id] = row.use_count
      })
    }
    useCounts.value = counts

    // If user is logged in, get their specific usage
    if (auth.user.value) {
      const { data: userData, error: userError } = await supabase
        .from('user_resources')
        .select('resource_id')
        .eq('user_id', auth.user.value.id)
      
      if (userError) throw userError

      const userUsed: {[key: number]: boolean} = {}
      if (userData && Array.isArray(userData)) {
        (userData as Array<{ resource_id: number }>).forEach((row) => {
          userUsed[row.resource_id] = true
        })
      }
      userUsedResources.value = userUsed
    } else {
      userUsedResources.value = {}
    }

    console.log('Updated use counts:', counts)
    console.log('Updated user used states:', userUsedResources.value)
    console.log('Current user ID:', auth.user.value?.id)

  } catch (error: any) {
    console.error('Error fetching use counts:', error)
  }
}

// Watch for user login to refresh user's usage state
watch(() => auth.user.value, async (newUser, oldUser) => {
  console.log('User changed:', { 
    hadUser: !!oldUser, 
    hasUser: !!newUser,
    userId: newUser?.id
  })
  
  // Add a small delay to ensure Supabase is initialized
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (isSupabaseReady.value && supabase) {
    await fetchUseCounts()
  } else {
    console.log('Waiting for Supabase to be ready before fetching counts...')
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