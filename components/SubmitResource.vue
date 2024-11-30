<template>
  <Teleport to="body">
    <aside 
      v-if="show" 
      ref="modal"
      class="fixed right-4 top-4 bottom-4 w-2/5 bg-white rounded-md p-8 overflow-auto"
      style="transform: translateX(100%)"
    >
      <div 
        @click="close" 
        class="flex justify-center items-center bg-neutral-800 hover:bg-neutral-900 p-4 w-fit rounded-md cursor-pointer fixed top-8 right-9"
      >
        <img src="/img/db/icon-close.svg" alt="Close" class="size-4 fill-white" />
      </div>
      <form class="pt-16 flex flex-col gap-8" @submit.prevent="onSubmit">
        <fieldset class="flex flex-col gap-2">
          <label>Name</label>
          <input v-model="formData.name" name="softwareName" type="text" class="p-4 bg-neutral-100 rounded-lg" />
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label>Creator</label>
          <input v-model="formData.creator" name="softwareCreator" type="text" class="p-4 bg-neutral-100 rounded-lg" />
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label>Tags (comma separated)</label>
          <input v-model="formData.tags" name="softwareTags" type="text" class="p-4 bg-neutral-100 rounded-lg" />
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label>Price</label>
          <input v-model="formData.price" name="softwarePrice" type="text" class="p-4 bg-neutral-100 rounded-lg" />
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label>OS (comma separated)</label>
          <input v-model="formData.os" name="softwareOS" type="text" class="p-4 bg-neutral-100 rounded-lg" />
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label>Link</label>
          <input v-model="formData.link" name="softwareLink" type="text" class="p-4 bg-neutral-100 rounded-lg" />
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label>Image</label>
          <div class="relative w-[111px] h-[61px]">
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              @change="handleImageSelect"
            />
            <div 
              class="absolute inset-0 bg-neutral-100 rounded-md flex items-center justify-center overflow-hidden z-10"
            >
              <img 
                v-if="imagePreview" 
                :src="imagePreview" 
                class="w-full h-full object-cover"
                alt="Preview"
              />
              <span v-else class="text-sm text-neutral-400">Add Image</span>
            </div>
          </div>
          <p v-if="imageError" class="text-red-500 text-sm mt-1">{{ imageError }}</p>
        </fieldset>
        <button 
          type="submit" 
          class="bg-neutral-800 hover:bg-neutral-900 rounded-md p-4 cursor-pointer text-neutral-100"
          :disabled="isSubmitting"
          @click="onSubmit"
        >
          {{ submitButtonText }}
        </button>
      </form>
    </aside>
  </Teleport>
</template>

<script>
import gsap from 'gsap'
import { useSupabase } from '../utils/supabase'

export default {
  emits: ['close', 'resource-added', 'resource-updated'],
  setup() {
    const { supabase } = useSupabase()
    
    return {
      supabase
    }
  },
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    editMode: {
      type: Boolean,
      default: false
    },
    resourceToEdit: {
      type: Object,
      default: null
    }
  },
  computed: {
    submitButtonText() {
      if (this.isSubmitting) return 'Submitting...'
      return this.editMode ? 'Update' : 'Submit'
    }
  },
  data() {
    return {
      isSubmitting: false,
      imageFile: null,
      imagePreview: null,
      imageError: null,
      formData: {
        name: '',
        creator: '',
        tags: '',
        price: '',
        os: '',
        link: '',
        image_url: ''
      }
    }
  },
  watch: {
    show(newValue) {
      if (newValue) {
        this.$nextTick(() => {
          this.animateIn()
        })
      } else {
        this.animateOut()
      }
    },
    resourceToEdit: {
      immediate: true,
      handler(resource) {
        if (resource) {
          this.formData = {
            name: resource.name,
            creator: resource.creator,
            tags: resource.tags.join(', '),
            price: resource.price,
            os: resource.os.join(', '),
            link: resource.link,
            image_url: resource.image_url
          }
          if (resource.image_url) {
            this.imagePreview = resource.image_url
          }
        }
      }
    }
  },
  methods: {
    animateIn() {
      gsap.to(this.$refs.modal, {
        duration: 0.3,
        x: 0,
        ease: 'power2.out'
      })
    },
    animateOut() {
      gsap.to(this.$refs.modal, {
        duration: 0.3,
        x: '100%',
        ease: 'power2.in',
        onComplete: () => {
          this.resetForm()
          this.$emit('close')
        }
      })
    },
    close() {
      this.animateOut()
    },
    async ensureTableStructure() {
      try {
        const { error: tableError } = await this.supabase
          .from('resources')
          .select('id')
          .limit(1)

        if (tableError) {
          // Table doesn't exist, create it
          const { error: createError } = await this.supabase.rpc('create_resources_table', {
            sql: `
              CREATE TABLE IF NOT EXISTS resources (
                id BIGSERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                creator TEXT NOT NULL,
                tags TEXT[] NOT NULL,
                price TEXT NOT NULL,
                os TEXT[] NOT NULL,
                link TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
              );
            `
          })

          if (createError) throw createError
        }
      } catch (error) {
        console.error('Error ensuring table structure:', error)
        throw error
      }
    },
    handleImageSelect(event) {
      try {
        const file = event.target.files[0]
        if (!file) return

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
          this.imageError = 'Please select an image file'
          return
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          this.imageError = 'Image must be less than 5MB'
          return
        }

        this.imageFile = file
        this.imageError = null

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            this.imagePreview = e.target.result
          } catch (error) {
            console.error('Error setting preview:', error)
          }
        }
        reader.onerror = (error) => {
          console.error('Error reading file:', error)
          this.imageError = 'Error reading file'
        }
        reader.readAsDataURL(file)
      } catch (error) {
        console.error('Error in handleImageSelect:', error)
      }
    },

    async uploadImage() {
      if (!this.imageFile) return null

      try {
        const fileExt = this.imageFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `resource-images/${fileName}`

        // Upload the file
        const { error: uploadError } = await this.supabase.storage
          .from('resources')
          .upload(filePath, this.imageFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw uploadError
        }

        // Get public URL using the newer method
        const { data: { publicUrl } } = this.supabase.storage
          .from('resources')
          .getPublicUrl(filePath)

        // Verify URL is accessible
        const testResponse = await fetch(publicUrl)
        if (!testResponse.ok) {
          console.error('URL not accessible:', publicUrl)
          throw new Error('Generated URL is not accessible')
        }

        console.log('Successfully uploaded image:', publicUrl)
        return publicUrl

      } catch (error) {
        console.error('Error in uploadImage:', error)
        throw error
      }
    },

    async submitResource() {
      try {
        this.isSubmitting = true
        
        // Upload image first if one is selected
        let imageUrl = null
        if (this.imageFile) {
          imageUrl = await this.uploadImage()
        }

        // Convert comma-separated strings to arrays
        const processedData = {
          ...this.formData,
          tags: this.formData.tags.split(',').map(tag => tag.trim()),
          os: this.formData.os.split(',').map(os => os.trim()),
          image_url: imageUrl,
          created_at: new Date()
        }

        const { data, error } = await this.supabase
          .from('resources')
          .insert([processedData])

        if (error) throw error

        // Reset form
        this.formData = {
          name: '',
          creator: '',
          tags: '',
          price: '',
          os: '',
          link: '',
          image_url: ''
        }
        this.imageFile = null
        this.imagePreview = null

        // Close modal with animation
        this.animateOut()
        
        // Emit event to refresh Database.vue
        this.$emit('resource-added')

      } catch (error) {
        console.error('Error submitting resource:', error)
        alert('Failed to submit resource. Please try again.')
      } finally {
        this.isSubmitting = false
      }
    },
    async updateResource() {
      try {
        this.isSubmitting = true
        console.log('Starting update for resource:', this.resourceToEdit.id)
        
        let imageUrl = this.resourceToEdit.image_url

        // If a new image was selected, upload it and delete the old one
        if (this.imageFile) {
          console.log('Updating image...')
          // Delete old image if it exists
          if (this.resourceToEdit.image_url) {
            const oldPath = this.resourceToEdit.image_url
              .split('resource-images/')[1] // Get just the filename part
            
            if (oldPath) {
              const { error: deleteError } = await this.supabase.storage
                .from('resources')
                .remove([`resource-images/${oldPath}`])
              
              if (deleteError) {
                console.error('Error deleting old image:', deleteError)
                throw deleteError
              }
            }
          }
          
          // Upload new image
          imageUrl = await this.uploadImage()
          console.log('New image URL:', imageUrl)
        }

        // Process the data
        const processedData = {
          ...this.formData,
          tags: this.formData.tags.split(',').map(tag => tag.trim()),
          os: this.formData.os.split(',').map(os => os.trim()),
          image_url: imageUrl
        }

        console.log('Updating with data:', processedData)

        // Update the record
        const { data, error } = await this.supabase
          .from('resources')
          .update(processedData)
          .eq('id', this.resourceToEdit.id)
          .select()

        if (error) {
          console.error('Update error:', error)
          throw error
        }

        console.log('Update successful:', data)

        // Emit event to refresh Database.vue
        this.$emit('resource-updated')
        
        // Close modal with animation first
        this.animateOut()

      } catch (error) {
        console.error('Error updating resource:', error)
        alert(`Failed to update resource: ${error.message}`)
      } finally {
        this.isSubmitting = false
      }
    },

    resetForm() {
      this.formData = {
        name: '',
        creator: '',
        tags: '',
        price: '',
        os: '',
        link: '',
        image_url: ''
      }
      this.imageFile = null
      this.imagePreview = null
      this.imageError = null
    },
    onSubmit(e) {
      console.log('Form submitted', this.editMode ? 'update' : 'create')
      if (this.editMode) {
        this.updateResource()
      } else {
        this.submitResource()
      }
    }
  },
  mounted() {
    if (this.show) {
      this.$nextTick(() => {
        this.animateIn()
      })
    }
  }
}
</script>

