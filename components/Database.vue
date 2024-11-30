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
    <div v-else v-for="resource in resources" :key="resource.id" class="table-row-group">
      <div class="table-row">
        <div class="table-cell db-cell relative group">
          <div 
            class="absolute left-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"
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
            <div class="w-[111px] h-[61px] bg-neutral-200 rounded-md overflow-hidden">
              <img 
                v-if="resource.image_url" 
                :src="getImageUrl(resource.image_url)" 
                :alt="resource.name"
                class="w-full h-full object-cover"
                @error="handleImageError"
              />
            </div>
            <h3>{{ resource.name }}</h3>
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
        <div class="table-cell db-cell">
          ${{ resource.price }}
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

<script>
import { useSupabase } from '../utils/supabase'

export default {
  setup() {
    const { supabase } = useSupabase()
    
    return {
      supabase
    }
  },
  data() {
    return {
      resources: [],
      searchQuery: '',
      currentSort: {
        sortBy: 'created_at',
        sortDirection: 'desc'
      },
      currentFilters: {
        price: {
          free: false,
          paid: false
        },
        os: [],
        tags: []
      }
    }
  },
  methods: {
    editResource(resource) {
      this.$emit('edit-resource', resource)
    },
    async fetchResources() {
      try {
        const { data, error } = await this.supabase
          .from('resources')
          .select('*')
          
        if (error) throw error

        // Apply search filter first
        let filteredData = data
        if (this.searchQuery) {
          const query = this.searchQuery.trim().toLowerCase()
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
          if (this.currentFilters.price.free || this.currentFilters.price.paid) {
            const price = parseFloat(resource.price.replace('$', ''))
            const isFree = price === 0
            if (this.currentFilters.price.free && !isFree) return false
            if (this.currentFilters.price.paid && isFree) return false
          }

          // OS filter
          if (this.currentFilters.os.length > 0) {
            const hasMatchingOS = this.currentFilters.os.some(os => 
              resource.os.includes(os)
            )
            if (!hasMatchingOS) return false
          }

          // Tags filter
          if (this.currentFilters.tags.length > 0) {
            const hasAllTags = this.currentFilters.tags.every(tag =>
              resource.tags.includes(tag)
            )
            if (!hasAllTags) return false
          }

          return true
        })

        // Finally apply sorting
        if (this.currentSort.sortBy === 'price') {
          filteredData.sort((a, b) => {
            const priceA = parseFloat(a.price.replace('$', ''))
            const priceB = parseFloat(b.price.replace('$', ''))
            return this.currentSort.sortDirection === 'asc' 
              ? priceA - priceB 
              : priceB - priceA
          })
        } else {
          filteredData.sort((a, b) => {
            const valueA = a[this.currentSort.sortBy]
            const valueB = b[this.currentSort.sortBy]
            const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0
            return this.currentSort.sortDirection === 'asc' 
              ? comparison 
              : -comparison
          })
        }

        this.resources = filteredData

      } catch (error) {
        console.error('Error fetching resources:', error)
      }
    },
    async confirmDelete(resource) {
      if (confirm('Are you sure you want to delete this resource?')) {
        try {
          console.log('Deleting resource:', resource.id)

          // Delete image from storage if it exists
          if (resource.image_url) {
            const oldPath = resource.image_url.split('/').pop()
            console.log('Deleting image:', oldPath)
            const { error: storageError } = await this.supabase.storage
              .from('resources')
              .remove([`resource-images/${oldPath}`])
            
            if (storageError) {
              console.error('Storage delete error:', storageError)
              throw storageError
            }
          }

          // Delete the database record
          const { error: deleteError } = await this.supabase
            .from('resources')
            .delete()
            .eq('id', resource.id)
            .select() // Add this to get response data

          if (deleteError) {
            console.error('Database delete error:', deleteError)
            throw deleteError
          }

          console.log('Successfully deleted resource')
          // Refresh the list
          await this.fetchResources()

        } catch (error) {
          console.error('Error deleting resource:', error)
          alert(`Failed to delete resource: ${error.message}`)
        }
      }
    },
    getImageUrl(url) {
      if (!url) return ''
      // Make sure we're using the correct URL format
      const { supabase } = useSupabase()
      const path = url.split('/').pop() // Get filename
      return supabase.storage
        .from('resources')
        .getPublicUrl(`resource-images/${path}`).data.publicUrl
    },
    handleImageError(e) {
      console.error('Image failed to load:', e.target.src)
      e.target.src = '/img/placeholder.png' // You can add a placeholder image
    },
    updateSort(sortParams) {
      console.log('Updating sort:', sortParams)
      this.currentSort = sortParams
      this.fetchResources()
    },
    updateFiltersAndSort(params) {
      console.log('Updating filters and sort:', params)
      this.currentSort = params.sort
      this.currentFilters = params.filters
      this.fetchResources()
    },
    handleSearch(query) {
      this.searchQuery = query
      this.fetchResources()
    }
  },
  mounted() {
    this.fetchResources()
  }
}
</script>