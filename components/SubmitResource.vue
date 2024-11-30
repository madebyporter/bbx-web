<template>
  <Teleport to="body">
    <aside 
      v-if="show" 
      ref="modal"
      class="fixed right-4 top-4 bottom-4 w-2/5 bg-white rounded-md p-8 overflow-auto z-50"
      style="transform: translateX(100%)"
    >
      <div 
        @click="close" 
        class="flex justify-center items-center bg-neutral-800 hover:bg-neutral-900 p-4 w-fit rounded-md cursor-pointer fixed top-8 right-9"
      >
        <img src="/img/db/icon-close.svg" alt="Close" class="size-4 fill-white" />
      </div>
      <h2 class="text-2xl font-bold">Submit Resource</h2>
      <form class="pt-8 flex flex-col gap-8" @submit.prevent="onSubmit">
        <fieldset class="flex flex-col gap-2">
          <label class="flex items-center gap-1">
            Type
            <span class="text-red-500">*</span>
          </label>
          <div class="flex flex-wrap gap-2">
            <label 
              v-for="type in resourceTypes" 
              :key="type.value"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input 
                type="radio" 
                :value="type.value" 
                v-model="formData.type"
                class="hidden" 
              />
              <div 
                class="px-3 py-2 rounded-md flex items-center gap-2"
                :class="[
                  formData.type === type.value 
                    ? 'tag-active' 
                    : 'tag'
                ]"
              >
                <span>{{ type.label }}</span>
              </div>
            </label>
          </div>
          <span v-if="errors.type" class="text-red-500 text-sm">{{ errors.type }}</span>
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label class="flex items-center gap-1">
            Name
            <span class="text-red-500">*</span>
          </label>
          <input 
            v-model="formData.name" 
            name="softwareName" 
            type="text" 
            class="p-4 bg-neutral-100 rounded-lg" 
            :class="{ 'border border-red-500': errors.name }"
            required
          />
          <span v-if="errors.name" class="text-red-500 text-sm">{{ errors.name }}</span>
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label class="flex items-center gap-1">
            Creator
            <span class="text-red-500">*</span>
          </label>
          <input 
            v-model="formData.creator" 
            name="softwareCreator" 
            type="text" 
            class="p-4 bg-neutral-100 rounded-lg"
            :class="{ 'border border-red-500': errors.creator }"
            required
          />
          <span v-if="errors.creator" class="text-red-500 text-sm">{{ errors.creator }}</span>
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label class="flex items-center gap-1">
            Tags
            <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <div class="flex flex-wrap gap-2 p-4 bg-neutral-100 rounded-lg min-h-[56px]">
              <!-- Selected tags -->
              <div 
                v-for="tag in selectedTags" 
                :key="tag" 
                class="tag"
              >
                {{ tag }}
                <button 
                  @click="removeTag(tag)" 
                  class="hover:text-neutral-600 cursor-pointer"
                >
                  ×
                </button>
              </div>
              
              <!-- Tag input -->
              <input 
                v-model="tagInput"
                type="text"
                class="flex-grow bg-transparent outline-none"
                placeholder="Type to search or add tags"
                @input="searchTags"
                @keydown.enter.prevent="addTag"
              />
            </div>

            <!-- Tag suggestions dropdown -->
            <div 
              v-if="showSuggestions && filteredTags.length > 0"
              class="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
            >
              <div 
                v-for="tag in filteredTags" 
                :key="tag"
                class="px-4 py-2 hover:bg-neutral-100 cursor-pointer"
                @click="selectTag(tag)"
              >
                {{ tag }}
              </div>
            </div>
          </div>
          <span v-if="errors.tags" class="text-red-500 text-sm">{{ errors.tags }}</span>
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label class="flex items-center gap-1">
            Price
            <span class="text-red-500">*</span>
          </label>
          <input 
            v-model="formData.price" 
            name="softwarePrice" 
            type="text" 
            class="p-4 bg-neutral-100 rounded-lg"
            :class="{ 'border border-red-500': errors.price }"
            required
          />
          <span v-if="errors.price" class="text-red-500 text-sm">{{ errors.price }}</span>
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label class="flex items-center gap-1">
            Operating Systems
            <span class="text-red-500">*</span>
          </label>
          <div class="flex flex-wrap gap-4 p-4 bg-neutral-100 rounded-lg">
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                value="mac" 
                v-model="selectedOS"
                class="hidden"
              />
              <div class="flex items-center gap-2 px-3 py-2 rounded-md" :class="[
                selectedOS.includes('mac') 
                  ? 'tag-active' 
                  : 'tag'
              ]">
                <IconApple />
                <span>macOS</span>
              </div>
            </label>
            
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                value="windows" 
                v-model="selectedOS"
                class="hidden"
              />
              <div class="flex items-center gap-2 px-3 py-2 rounded-md" :class="[
                selectedOS.includes('windows') 
                  ? 'tag-active' 
                  : 'tag'
              ]">
                <IconWindows />
                <span>Windows</span>
              </div>
            </label>
            
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                value="linux" 
                v-model="selectedOS"
                class="hidden"
              />
              <div class="flex items-center gap-2 px-3 py-2 rounded-md" :class="[
                selectedOS.includes('linux') 
                  ? 'tag-active' 
                  : 'tag'
              ]">
                <IconLinux />
                <span>Linux</span>
              </div>
            </label>
          </div>
          <span v-if="errors.os" class="text-red-500 text-sm">{{ errors.os }}</span>
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label class="flex items-center gap-1">
            Link
            <span class="text-red-500">*</span>
          </label>
          <input 
            v-model="formData.link" 
            name="softwareLink" 
            type="text" 
            class="p-4 bg-neutral-100 rounded-lg"
            :class="{ 'border border-red-500': errors.link }"
            required
          />
          <span v-if="errors.link" class="text-red-500 text-sm">{{ errors.link }}</span>
        </fieldset>
        <fieldset class="flex flex-col gap-2">
          <label class="flex items-center gap-1">
            Image
            <span class="text-red-500">*</span>
          </label>
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
          <span v-if="errors.image" class="text-red-500 text-sm">{{ errors.image }}</span>
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
        price: '',
        link: '',
        image_url: '',
        type: 'software'
      },
      tagInput: '',
      selectedTags: [],
      availableTags: [],
      showSuggestions: false,
      filteredTags: [],
      selectedOS: [],
      resourceTypes: [
        { value: 'software', label: 'Software' },
        { value: 'hardware', label: 'Hardware' },
        { value: 'tutorial', label: 'Tutorial' },
        { value: 'sample_pack', label: 'Sample Pack' },
        { value: 'preset_pack', label: 'Preset Pack' }
      ],
      errors: {
        name: '',
        creator: '',
        tags: '',
        price: '',
        os: '',
        link: '',
        image: '',
        type: ''
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
            price: resource.price,
            link: resource.link,
            image_url: resource.image_url,
            type: resource.type
          }
          this.selectedTags = resource.tags || []
          this.selectedOS = resource.os || []
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

    async fetchTags() {
      try {
        const { data, error } = await this.supabase
          .from('resources')
          .select('tags')

        if (error) throw error

        // Flatten and deduplicate tags
        this.availableTags = [...new Set(data.flatMap(resource => resource.tags))]
          .sort((a, b) => a.localeCompare(b))

      } catch (error) {
        console.error('Error fetching tags:', error)
      }
    },

    searchTags() {
      if (!this.tagInput) {
        this.showSuggestions = false
        return
      }

      const searchTerm = this.tagInput.toLowerCase()
      this.filteredTags = this.availableTags
        .filter(tag => 
          tag.toLowerCase().includes(searchTerm) && 
          !this.selectedTags.includes(tag)
        )
      this.showSuggestions = true
    },

    selectTag(tag) {
      if (!this.selectedTags.includes(tag)) {
        this.selectedTags.push(tag)
      }
      this.tagInput = ''
      this.showSuggestions = false
    },

    addTag() {
      if (!this.tagInput.trim()) return
      
      const newTag = this.tagInput.trim().toUpperCase()
      if (!this.selectedTags.includes(newTag)) {
        this.selectedTags.push(newTag)
      }
      this.tagInput = ''
      this.showSuggestions = false
    },

    removeTag(tag) {
      this.selectedTags = this.selectedTags.filter(t => t !== tag)
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
          tags: this.selectedTags,
          os: this.selectedOS,
          image_url: imageUrl,
          type: 'software',
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
          price: '',
          link: '',
          image_url: '',
          type: 'software'
        }
        this.selectedTags = []
        this.selectedOS = []
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
          tags: this.selectedTags,
          os: this.selectedOS,
          image_url: imageUrl,
          type: 'software'
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
        price: '',
        link: '',
        image_url: '',
        type: 'software'
      }
      this.selectedTags = []
      this.selectedOS = []
      this.imageFile = null
      this.imagePreview = null
      this.imageError = null
    },
    validateForm() {
      let isValid = true
      this.errors = {
        name: '',
        creator: '',
        tags: '',
        price: '',
        os: '',
        link: '',
        image: '',
        type: ''
      }

      // Name validation
      if (!this.formData.name.trim()) {
        this.errors.name = 'Name is required'
        isValid = false
      }

      // Creator validation
      if (!this.formData.creator.trim()) {
        this.errors.creator = 'Creator is required'
        isValid = false
      }

      // Tags validation
      if (this.selectedTags.length === 0) {
        this.errors.tags = 'At least one tag is required'
        isValid = false
      }

      // Price validation
      if (!this.formData.price.trim()) {
        this.errors.price = 'Price is required'
        isValid = false
      }

      // OS validation
      if (this.selectedOS.length === 0) {
        this.errors.os = 'At least one operating system is required'
        isValid = false
      }

      // Link validation
      if (!this.formData.link.trim()) {
        this.errors.link = 'Link is required'
        isValid = false
      } else if (!this.formData.link.startsWith('http')) {
        this.errors.link = 'Please enter a valid URL starting with http:// or https://'
        isValid = false
      }

      // Image validation
      if (!this.imageFile && !this.formData.image_url) {
        this.errors.image = 'Image is required'
        isValid = false
      }

      // Type validation
      if (!this.formData.type) {
        this.errors.type = 'Type is required'
        isValid = false
      }

      return isValid
    },
    onSubmit(e) {
      if (!this.validateForm()) {
        return
      }

      console.log('Form submitted', this.editMode ? 'update' : 'create')
      if (this.editMode) {
        this.updateResource()
      } else {
        this.submitResource()
      }
    }
  },
  mounted() {
    this.fetchTags()
    if (this.show) {
      this.$nextTick(() => {
        this.animateIn()
      })
    }
  }
}
</script>

