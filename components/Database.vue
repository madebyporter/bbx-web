<template>
  <div class="table w-full">
    <div class="table-header-group">
      <div class="table-row">
        <div class="table-cell db-head db-col-lg">Name</div>
        <div class="table-cell db-head db-col-sm">Creator</div>
        <div class="table-cell db-head db-col-md">Tags</div>
        <div class="table-cell db-head db-col-sm">Price</div>
        <div class="table-cell db-head db-col-sm">OS</div>
        <!-- <div class="table-cell db-head db-col-sm">Owned</div> -->
        <div class="table-cell db-head db-col-sm">Download</div>
      </div>
    </div>
    <div v-for="resource in resources" :key="resource.id" class="table-row-group">
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
        <!-- <div class="table-cell db-cell">
          Owned
        </div> -->
        <div class="table-cell db-cell">
          <a :href="resource.link" target="_blank" class="bg-neutral-100 hover:bg-neutral-200 rounded-md px-4 p-2">
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
      resources: []
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
          .order('created_at', { ascending: false })

        if (error) throw error
        this.resources = data

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
    }
  },
  mounted() {
    this.fetchResources()
  }
}
</script>