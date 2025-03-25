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
      class="relative border border-neutral-800 p-4 rounded-lg group"
      :class="{ 'pending-resource': resource.status === 'pending' }"
    >
      <!-- Edit/Delete Buttons -->
      <div 
        v-if="props.canEdit"
        class="absolute left-8 top-8 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"
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

interface FilterSortParams {
  sort: {
    sortBy: string
    sortDirection: 'asc' | 'desc'
  }
  filters: {
    price: { free: boolean; paid: boolean }
    os: string[]
    tags: string[]
  }
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
const currentSort = ref<{sortBy: string, sortDirection: 'asc' | 'desc'}>({ 
  sortBy: 'created_at', 
  sortDirection: 'desc' 
})
const currentFilters = ref({
  price: { free: false, paid: false },
  os: [] as string[],
  tags: [] as string[]
})
const searchQuery = ref('')

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
    console.log('DatabaseGrid: Fetching resources with:', {
      filters: currentFilters.value,
      sort: currentSort.value,
      search: searchQuery.value,
      type: props.type
    })

    // Start building the query
    let query = supabase
      .from('resources')
      .select(`
        id,
        name,
        price,
        link,
        image_url,
        os,
        created_at,
        type_id,
        creator:creators(id, name),
        type:resource_types(id, slug, display_name),
        resource_tags!inner(
          tags(name)
        )
      `)
      .eq('status', 'approved')

    // Filter by type if specified
    if (props.type) {
      query = query.filter('resource_types.slug', 'eq', props.type)
    }

    // Apply price filter
    if (currentFilters.value.price?.free || currentFilters.value.price?.paid) {
      console.log('DatabaseGrid: Applying price filter:', currentFilters.value.price);
      
      if (currentFilters.value.price.free && !currentFilters.value.price.paid) {
        // Free items: Match any of these conditions
        console.log('DatabaseGrid: Filtering for FREE items');
        
        // Alternative approach for free items using multiple OR conditions
        query = query.or(
          'price.is.null,' +
          'price.eq.$0,' +
          'price.eq.0,' + 
          'price.eq.free,' +
          'price.eq.$0.00,' +
          'price.ilike.%free%'
        );
        
        console.log('DatabaseGrid: Free query:', query);
      } else if (!currentFilters.value.price.free && currentFilters.value.price.paid) {
        // Paid items: Exclude all free variations and nulls
        console.log('DatabaseGrid: Filtering for PAID items');
        
        // First, create a base query excluding nulls
        let paidQuery = query.not('price', 'is', null);
        
        // Then add additional conditions to exclude various forms of "free"
        paidQuery = paidQuery.not('price', 'eq', '$0');
        paidQuery = paidQuery.not('price', 'eq', '0');
        paidQuery = paidQuery.not('price', 'eq', 'free');
        paidQuery = paidQuery.not('price', 'eq', '$0.00');
        paidQuery = paidQuery.not('price', 'ilike', '%free%');
        
        query = paidQuery;
        console.log('DatabaseGrid: Paid query:', query);
      } else if (currentFilters.value.price.free && currentFilters.value.price.paid) {
        // Both selected - this effectively means "show all", so no filtering needed
        console.log('DatabaseGrid: Both price filters selected, showing all resources');
      } else {
        console.log('DatabaseGrid: No price filters selected, not applying price filter');
      }
    }

    // Apply OS filter
    if (currentFilters.value.os?.length > 0) {
      console.log('DatabaseGrid: Filtering by OS:', currentFilters.value.os);
      
      // We want resources that contain ANY of the selected OS values
      const osValues = currentFilters.value.os;
      
      if (osValues.length === 1) {
        // If only one OS is selected, use a simpler contains query
        query = query.contains('os', [osValues[0]]);
        console.log(`DatabaseGrid: Filtering for OS: ${osValues[0]}`);
      } else {
        // If multiple OS values are selected, we use OR to match any of them
        let orConditions = '';
        osValues.forEach((os, index) => {
          if (index > 0) orConditions += ',';
          orConditions += `os.cs.{${os}}`;
        });
        
        query = query.or(orConditions);
        console.log('DatabaseGrid: Filtering for multiple OS with query:', orConditions);
      }
    }

    // Apply tag filter
    if (currentFilters.value.tags?.length > 0) {
      console.log('DatabaseGrid: Filtering by tags:', currentFilters.value.tags);
      
      // To match resources with ALL selected tags, we use multiple filters
      const tags = currentFilters.value.tags;
      
      // By using the nested resource_tags.tags.name field and filtering
      // multiple times, we ensure resources must have ALL selected tags
      for (const tag of tags) {
        const tagName = tag.toLowerCase();
        query = query.filter('resource_tags.tags.name', 'eq', tagName);
        console.log(`DatabaseGrid: Added filter for tag: ${tagName}`);
      }
      
      console.log('DatabaseGrid: Final tag filter query:', query);
    }

    // Apply search
    if (searchQuery.value) {
      query = query.ilike('name', `%${searchQuery.value}%`)
    }

    // Apply sorting
    if (currentSort.value.sortBy) {
      const direction = { ascending: currentSort.value.sortDirection === 'asc' }
      
      // Special handling for different sort fields
      switch (currentSort.value.sortBy) {
        case 'creator':
          query = query.order('creators.name', direction)
          break
        case 'type':
          query = query.order('resource_types.display_name', direction)
          break
        case 'price':
          // For price sorting, we need to handle it in the JS layer after fetching
          // because Supabase doesn't allow complex string parsing in the query
          console.log('DatabaseGrid: Will sort by price after fetching data')
          query = query.order('id', direction) // Default order for now
          break
        default:
          query = query.order(currentSort.value.sortBy, direction)
      }
    }

    // Execute query
    console.log('DatabaseGrid: Executing Supabase query');
    const { data, error } = await query;

    if (error) {
      console.error('DatabaseGrid: Query error:', error);
      throw error;
    }

    if (!data) {
      console.log('DatabaseGrid: No results found');
      resources.value = [];
      return;
    }

    // Process results
    const processedData = data.map(item => {
      const typedItem = item as any
      
      // Extract tags from the nested structure
      const tags = typedItem.resource_tags
        ?.map((rt: any) => rt.tags?.name)
        .filter(Boolean) || []

      return {
        id: typedItem.id,
        name: typedItem.name,
        creator: typedItem.creator?.name || '',
        creator_id: typedItem.creator?.id,
        price: typedItem.price,
        link: typedItem.link,
        image_url: typedItem.image_url,
        os: typedItem.os || [],
        tags,
        type: typedItem.type,
        type_id: typedItem.type_id,
        created_at: typedItem.created_at
      } as Resource
    })

    // Apply custom sorting for price if needed
    if (currentSort.value.sortBy === 'price') {
      console.log('DatabaseGrid: Applying custom price sorting')
      
      // Sort the processed data by extracted numeric price
      processedData.sort((a, b) => {
        const priceA = extractNumericPrice(a.price);
        const priceB = extractNumericPrice(b.price);
        
        // Apply sorting direction
        return currentSort.value.sortDirection === 'asc' 
          ? priceA - priceB 
          : priceB - priceA;
      });
      
      console.log('DatabaseGrid: Price sorting applied')
    }

    resources.value = processedData
    await fetchUseCounts()
  } catch (error) {
    console.error('DatabaseGrid: Error fetching resources:', error)
    resources.value = []
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

const emit = defineEmits(['edit-resource', 'show-signup'])

const editResource = (resource: Resource) => {
  emit('edit-resource', resource)
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

const handleSearch = async (query: string) => {
  searchQuery.value = query
  await fetchResources()
}

const updateFiltersAndSort = async (params: FilterSortParams) => {
  console.log('DatabaseGrid: Updating filters and sort:', params)
  
  if (!params) {
    console.error('DatabaseGrid: Invalid filter params received')
    return
  }
  
  // Validate and update the values
  if (params.sort && typeof params.sort.sortBy === 'string' && 
      (params.sort.sortDirection === 'asc' || params.sort.sortDirection === 'desc')) {
    currentSort.value = params.sort
  } else {
    console.error('DatabaseGrid: Invalid sort parameters', params.sort)
  }
  
  if (params.filters) {
    // Validate price filter
    if (params.filters.price && typeof params.filters.price.free === 'boolean' && 
        typeof params.filters.price.paid === 'boolean') {
      currentFilters.value.price = params.filters.price
    }
    
    // Validate OS filter
    if (Array.isArray(params.filters.os)) {
      currentFilters.value.os = params.filters.os
    }
    
    // Validate tags filter
    if (Array.isArray(params.filters.tags)) {
      currentFilters.value.tags = params.filters.tags
    }
  } else {
    console.error('DatabaseGrid: Invalid filter parameters')
  }
  
  // Fetch new results with updated filters
  await fetchResources()
}

// Helper function to extract numeric price from various price formats
const extractNumericPrice = (priceStr: string): number => {
  if (!priceStr) return 0;
  
  // Handle "Free" or empty string case
  if (priceStr.toLowerCase().includes('free') || priceStr.trim() === '') {
    return 0;
  }
  
  // Extract the first number from the string (with decimals)
  const matches = priceStr.match(/\$?(\d+(?:\.\d+)?)/);
  if (matches && matches[1]) {
    return parseFloat(matches[1]);
  }
  
  return 0;
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

// Expose methods for parent component
defineExpose({
  fetchResources,
  handleSearch,
  updateFiltersAndSort
})
</script> 