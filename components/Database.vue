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
    <div v-else v-for="resource in resources" :key="resource.id" class="table-row-group hover:ring-1 hover:ring-neutral-800 hover:bg-neutral-800/5">
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
            <div v-if="resource.os.includes('mac')">
              <svg width="12" height="15" viewBox="0 0 12 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="fill-neutral-700" d="M9.9375 7.40984C9.9375 7.47234 9.84375 9.31609 11.875 10.2848C11.5 11.4411 10.1875 14.0036 8.65625 14.0036C7.78125 14.0036 7.28125 13.4411 6.28125 13.4411C5.25 13.4411 4.6875 14.0036 3.90625 14.0036C2.40625 14.0661 0.96875 11.2536 0.5625 10.0973C0.25 9.22234 0.125 8.37859 0.125 7.56609C0.125 4.78484 1.96875 3.44109 3.71875 3.40984C4.5625 3.40984 5.625 4.00359 6.09375 4.00359C6.53125 4.00359 7.75 3.28484 8.875 3.37859C10.0312 3.47234 10.9062 3.90984 11.5 4.75359C10.4688 5.40984 9.9375 6.25359 9.9375 7.40984ZM8.1875 2.28484C7.5625 3.00359 6.8125 3.40984 6 3.34734C5.9375 2.50359 6.25 1.72234 6.8125 1.09734C7.3125 0.534843 8.1875 0.0660934 8.9375 0.00359344C8.9375 0.347343 9.03125 1.28484 8.1875 2.28484Z" />
              </svg>
            </div>
            <div v-if="resource.os.includes('windows')">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="fill-neutral-700" d="M0 1.94109V6.69109H5.71875V1.15984L0 1.94109ZM0 12.0973V7.40984H5.71875V12.8786L0 12.0973ZM6.34375 12.9723V7.40984H14V14.0036L6.34375 12.9723ZM6.34375 1.06609L14 0.00359344V6.69109H6.34375V1.06609Z" />
              </svg>
            </div>
          </div>
        </div>
        <!-- I Use This -->
        <div class="table-cell db-cell">
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
import { ref, onMounted, watch, computed } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { fetchResourcesWithTags, deleteResource, type ResourceType } from '~/utils/resourceQueries'
import { useAuth } from '~/composables/useAuth'

interface ResourceFilters {
  price: {
    free: boolean
    paid: boolean
  }
  os: string[]
  tags: string[]
}

interface ResourceUseCount {
  resource_id: number
  count: string
}

interface ResourceUserUse {
  resource_id: number
}

interface SortParams {
  sortBy: string
  sortDirection: 'asc' | 'desc'
}

interface FilterSortParams {
  sort: SortParams
  filters: ResourceFilters
}

interface Resource {
  id: number
  name: string
  creator: string
  creator_id?: number
  price: string
  link: string
  image_url: string | null
  os: string[]
  type_id: number
  type: ResourceType
  tags: string[]
  created_at: string
  status?: 'pending' | 'approved' | 'rejected'
}

const props = defineProps<{
  canEdit: boolean
  type?: string
}>()

const { supabase } = useSupabase()
const auth = useAuth()
const resources = ref<Resource[]>([])
const currentSort = ref<SortParams>({ sortBy: 'created_at', sortDirection: 'desc' })
const currentFilters = ref<ResourceFilters>({
  price: { free: false, paid: false },
  os: [],
  tags: []
})
const searchQuery = ref('')
const useCounts = ref<{[key: number]: number}>({})
const userUsedResources = ref<{[key: number]: boolean}>({})
const isSupabaseReady = ref(false)

const fetchResources = async () => {
  if (!supabase) {
    console.error('Database: Supabase client not initialized')
    return
  }

  try {
    console.log('Database: Fetching resources with:', {
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
        status,
        created_at,
        type_id,
        creator:creators(id, name),
        type:resource_types(id, slug, display_name),
        resource_tags!inner(
          tags(name)
        )
      `)

    // Filter by type if specified
    if (props.type) {
      console.log('Database: Filtering by type slug:', props.type)
      try {
        // First approach: Get the type_id for the given slug
        const { data: typeData, error: typeError } = await supabase
          .from('resource_types')
          .select('id')
          .eq('slug', props.type)
          .single() as { data: { id: number } | null, error: any }
          
        if (typeError) {
          console.error('Database: Error finding resource type:', typeError)
          // Fallback approach: Try direct filtering
          console.log('Database: Trying direct filtering approach')
          query = query.filter('resource_types.slug', 'eq', props.type)
        } else if (typeData) {
          console.log('Database: Found type ID:', typeData.id)
          // Filter resources by the type_id
          query = query.eq('type_id', typeData.id)
        } else {
          console.error('Database: Resource type not found for slug:', props.type)
        }
      } catch (err) {
        console.error('Database: Exception during type filtering:', err)
      }
    }

    // Apply price filter
    if (currentFilters.value.price?.free || currentFilters.value.price?.paid) {
      console.log('Database: Applying price filter:', currentFilters.value.price);
      
      if (currentFilters.value.price.free && !currentFilters.value.price.paid) {
        // Free items: Match any of these conditions
        console.log('Database: Filtering for FREE items');
        
        // Alternative approach for free items using multiple OR conditions
        query = query.or(
          'price.is.null,' +
          'price.eq.$0,' +
          'price.eq.0,' + 
          'price.eq.free,' +
          'price.eq.$0.00,' +
          'price.ilike.%free%'
        );
        
        console.log('Database: Free query:', query);
      } else if (!currentFilters.value.price.free && currentFilters.value.price.paid) {
        // Paid items: Exclude all free variations and nulls
        console.log('Database: Filtering for PAID items');
        
        // First, create a base query excluding nulls
        let paidQuery = query.not('price', 'is', null);
        
        // Then add additional conditions to exclude various forms of "free"
        paidQuery = paidQuery.not('price', 'eq', '$0');
        paidQuery = paidQuery.not('price', 'eq', '0');
        paidQuery = paidQuery.not('price', 'eq', 'free');
        paidQuery = paidQuery.not('price', 'eq', '$0.00');
        paidQuery = paidQuery.not('price', 'ilike', '%free%');
        
        query = paidQuery;
        console.log('Database: Paid query:', query);
      } else if (currentFilters.value.price.free && currentFilters.value.price.paid) {
        // Both selected - this effectively means "show all", so no filtering needed
        console.log('Database: Both price filters selected, showing all resources');
      } else {
        console.log('Database: No price filters selected, not applying price filter');
      }
    }

    // Apply OS filter
    if (currentFilters.value.os?.length > 0) {
      console.log('Database: Filtering by OS:', currentFilters.value.os);
      
      // We want resources that contain ANY of the selected OS values
      const osValues = currentFilters.value.os;
      
      if (osValues.length === 1) {
        // If only one OS is selected, use a simpler contains query
        query = query.contains('os', [osValues[0]]);
        console.log(`Database: Filtering for OS: ${osValues[0]}`);
      } else {
        // If multiple OS values are selected, we use OR to match any of them
        let orConditions = '';
        osValues.forEach((os, index) => {
          if (index > 0) orConditions += ',';
          orConditions += `os.cs.{${os}}`;
        });
        
        query = query.or(orConditions);
        console.log('Database: Filtering for multiple OS with query:', orConditions);
      }
    }

    // Apply tag filter
    if (currentFilters.value.tags?.length > 0) {
      console.log('Database: Filtering by tags:', currentFilters.value.tags);
      
      // To match resources with ALL selected tags, we use multiple filters
      const tags = currentFilters.value.tags;
      
      // By using the nested resource_tags.tags.name field and filtering
      // multiple times, we ensure resources must have ALL selected tags
      for (const tag of tags) {
        const tagName = tag.toLowerCase();
        query = query.filter('resource_tags.tags.name', 'eq', tagName);
        console.log(`Database: Added filter for tag: ${tagName}`);
      }
      
      console.log('Database: Final tag filter query:', query);
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
          console.log('Database: Will sort by price after fetching data')
          query = query.order('id', direction) // Default order for now
          break
        default:
          query = query.order(currentSort.value.sortBy, direction)
      }
    }

    // Execute query
    console.log('Database: Executing Supabase query with filters applied');
    const { data, error } = await query;

    if (error) {
      console.error('Database: Query error:', error);
      throw error;
    }

    if (!data) {
      console.log('Database: No results found');
      resources.value = [];
      return;
    }

    console.log('Database: Raw query results:', data);
    
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
        type: typedItem.type?.[0],
        type_id: typedItem.type_id,
        created_at: typedItem.created_at,
        status: typedItem.status
      } as Resource
    })

    // Apply custom sorting for price if needed
    if (currentSort.value.sortBy === 'price') {
      console.log('Database: Applying custom price sorting')
      
      // Sort the processed data by extracted numeric price
      processedData.sort((a, b) => {
        const priceA = extractNumericPrice(a.price);
        const priceB = extractNumericPrice(b.price);
        
        // Apply sorting direction
        return currentSort.value.sortDirection === 'asc' 
          ? priceA - priceB 
          : priceB - priceA;
      });
      
      console.log('Database: Price sorting applied')
    }

    console.log('Database: Processed results:', processedData)
    resources.value = processedData

    // Update use counts
    await fetchUseCounts()

  } catch (error) {
    console.error('Database: Error fetching resources:', error)
    resources.value = []
  }
}

// Initialize Supabase
onMounted(async () => {
  if (supabase) {
    isSupabaseReady.value = true
    await fetchResources()
  } else {
  }
})

// Watch for auth changes
watch(() => auth.user, async (newUser, oldUser) => {
  if (isSupabaseReady.value) {
    await fetchUseCounts()
  } else {
  }
}, { immediate: true })

const emit = defineEmits(['edit-resource', 'show-signup'])

const editResource = (resource: Resource) => {
  emit('edit-resource', resource)
}

const fetchUseCounts = async () => {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return
  }

  try {
    // Get total use counts using raw SQL
    const { data: useCountsData, error: countError } = await supabase
      .rpc('get_resource_use_counts')
    
    if (countError) throw countError

    const counts: {[key: number]: number} = {}
    if (useCountsData) {
      (useCountsData as ResourceUseCount[]).forEach(row => {
        counts[row.resource_id] = parseInt(row.count)
      })
    }
    useCounts.value = counts

    // If user is logged in, fetch their used resources
    if (auth.user.value) {
      const { data: userUses, error: userError } = await supabase
        .from('user_resources')
        .select('resource_id')
        .eq('user_id', auth.user.value.id)

      if (userError) throw userError

      const userResources: {[key: number]: boolean} = {}
      if (userUses) {
        (userUses as ResourceUserUse[]).forEach(row => {
          userResources[row.resource_id] = true
        })
      }
      userUsedResources.value = userResources
    }
  } catch (error) {
    console.error('Error fetching use counts:', error)
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
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${process.env.NUXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resource-images/${url}`
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/img/placeholder.png'
}

const toggleUse = async (resource: Resource) => {
  if (!auth.user.value || !supabase) {
    emit('show-signup')
    return
  }

  try {
    const isUsing = userUsedResources.value[resource.id]
    
    if (isUsing) {
      // Remove use
      const { error } = await supabase
        .from('user_resources')
        .delete()
        .eq('resource_id', resource.id)
        .eq('user_id', auth.user.value.id)

      if (error) throw error
      
      userUsedResources.value[resource.id] = false
      useCounts.value[resource.id] = (useCounts.value[resource.id] || 1) - 1
    } else {
      // Add use
      const { error } = await supabase
        .from('user_resources')
        .insert({
          resource_id: resource.id,
          user_id: auth.user.value.id
        })

      if (error) throw error
      
      userUsedResources.value[resource.id] = true
      useCounts.value[resource.id] = (useCounts.value[resource.id] || 0) + 1
    }
  } catch (error) {
    console.error('Error toggling resource use:', error)
    alert('Failed to update resource use')
  }
}

const handleSearch = async (query: string) => {
  searchQuery.value = query
  await fetchResources()
}

const updateFiltersAndSort = async (params: FilterSortParams) => {
  console.log('Database: Updating filters and sort:', params)
  
  if (!params) {
    console.error('Database: Invalid filter params received')
    return
  }
  
  // Validate and update the values
  if (params.sort && typeof params.sort.sortBy === 'string' && 
      (params.sort.sortDirection === 'asc' || params.sort.sortDirection === 'desc')) {
    currentSort.value = params.sort
  } else {
    console.error('Database: Invalid sort parameters', params.sort)
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
    console.error('Database: Invalid filter parameters')
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

// Expose methods for parent components
defineExpose({
  fetchResources,
  handleSearch,
  updateFiltersAndSort
})
</script>

<style scoped>
</style>