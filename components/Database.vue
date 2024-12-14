<template>
  <div class="table w-full relative">
    <div class="table-header-group">
      <div class="table-row">
        <div class="table-cell db-head db-col-lg">Name</div>
        <div class="table-cell db-head db-col-sm">Creator</div>
        <div class="table-cell db-head db-col-md">Tags</div>
        <div class="table-cell db-head db-col-sm">Price</div>
        <div class="table-cell db-head db-col-sm">OS</div>
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
      <div class="table-row">
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

const { supabase } = useSupabase()
const resources = ref<Resource[]>([])
const currentSort = ref({ sortBy: 'created_at', sortDirection: 'desc' })
const currentFilters = ref({})
const searchQuery = ref('')

const emit = defineEmits(['edit-resource'])

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

    // Then apply other filters
    filteredData = filteredData.filter(resource => {
      // Price filter
      if (currentFilters.value.price?.free || currentFilters.value.price?.paid) {
        const price = parseFloat(resource.price.replace('$', ''))
        const isFree = price === 0
        if (currentFilters.value.price?.free && !isFree) return false
        if (currentFilters.value.price?.paid && isFree) return false
      }

      // OS filter
      if (currentFilters.value.os?.length > 0) {
        const hasMatchingOS = currentFilters.value.os.some(os => 
          resource.os.includes(os)
        )
        if (!hasMatchingOS) return false
      }

      // Tags filter
      if (currentFilters.value.tags?.length > 0) {
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
        const valueA = a[currentSort.value.sortBy]
        const valueB = b[currentSort.value.sortBy]
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
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert(`Failed to delete resource: ${error.message}`)
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

onMounted(() => {
  console.log('Database mounted with canEdit:', props.canEdit)
})

onMounted(() => {
  fetchResources()
})

defineExpose({
  fetchResources,
  updateFiltersAndSort,
  handleSearch
})
</script>