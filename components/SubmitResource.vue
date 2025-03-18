<template>
  <Teleport to="body">
    <aside 
      v-if="show" 
      ref="modal"
      class="modal"
      style="transform: translateX(100%)"
    >
      <div 
        @click="close" 
        class="flex justify-center items-center border border-neutral-800 hover:border-neutral-700 hover:border-neutral-700 p-4 w-fit rounded-md cursor-pointer fixed top-8 right-9"
      >
        <img src="/img/db/icon-close.svg" alt="Close" class="size-4 fill-neutral-700" />
      </div>
      
      <!-- Success Message -->
      <div v-if="showSuccessMessage" class="h-full flex flex-col items-center justify-center text-center gap-4">
        <h2 class="text-xl">Thanks for your submission.</h2>
        <p class="text-neutral-600">We will review and add this submission if it fits our criteria.</p>
        <button 
          @click="resetAndShowForm" 
          class="text-neutral-800 hover:text-neutral-600 underline mt-4 cursor-pointer"
        >
          Submit another resource
        </button>
      </div>

      <!-- Submit Form -->
      <template v-else>
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
              class="p-4 border border-neutral-800 hover:border-neutral-700 rounded-lg" 
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
            <div class="relative">
              <input 
                v-model="creatorInput" 
                name="softwareCreator" 
                type="text" 
                class="p-4 border border-neutral-800 hover:border-neutral-700 rounded-lg w-full"
                :class="{ 'border border-red-500': errors.creator }"
                @input="searchCreators"
                required
              />
              <!-- Creator suggestions dropdown -->
              <div 
                v-if="showCreatorSuggestions && filteredCreators.length > 0"
                class="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
              >
                <div 
                  v-for="creator in filteredCreators" 
                  :key="creator"
                  class="px-4 py-2 hover:bg-neutral-100 cursor-pointer"
                  @click="selectCreator(creator)"
                >
                  {{ creator }}
                </div>
              </div>
            </div>
            <span v-if="errors.creator" class="text-red-500 text-sm">{{ errors.creator }}</span>
          </fieldset>
          <fieldset class="flex flex-col gap-2">
            <label class="flex items-center gap-1">
              Tags
              <span class="text-red-500">*</span>
              <span class="text-xs text-neutral-400">(type and enter to add)</span>
            </label>
            <div class="relative">
              <div class="flex flex-wrap gap-2 p-4 border border-neutral-800 hover:border-neutral-700 rounded-lg min-h-[56px]">
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
                
                <!-- Tag input - hide when max tags reached -->
                <input 
                  v-if="selectedTags.length < 3"
                  v-model="tagInput"
                  type="text"
                  class="flex-grow bg-transparent outline-none"
                  placeholder="Type to search or add tags (max 3)"
                  @input="searchTags"
                  @keydown.enter.prevent="addTag"
                />
                
                <!-- Message when max tags reached -->
                <span v-else class="text-sm text-neutral-500">
                  Maximum 3 tags reached
                </span>
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
              class="p-4 border border-neutral-800 hover:border-neutral-700 rounded-lg"
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
            <div class="flex flex-wrap gap-4 p-4 border border-neutral-800 hover:border-neutral-700 rounded-lg">
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
              class="p-4 border border-neutral-800 hover:border-neutral-700 rounded-lg"
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
            <div 
              class="image-drop-zone relative w-full min-h-[350px] lg:w-full lg:h-full transition-colors duration-200"
              @dragover.prevent="handleDragOver"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
              :class="{ 
                'image-drop-zone-active': isDragging,
                'drag-over': !imagePreview 
              }"
            >
              <input 
                ref="fileInput"
                type="file" 
                accept="image/*"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                @change="handleImageSelect"
              />
              <div 
                class="absolute inset-0 border border-neutral-800 hover:border-neutral-700 rounded-md flex items-center justify-center overflow-hidden z-10"
              >
                <img 
                  v-if="imagePreview" 
                  :src="imagePreview" 
                  class="w-full h-full object-cover"
                  alt="Preview"
                />
                <div v-else class="flex flex-col items-center gap-2 p-4 text-center">
                  <span class="text-sm text-neutral-400">
                    Drag and drop an image here<br>or click to browse
                  </span>
                </div>
              </div>
            </div>
            <p v-if="imageError" class="text-red-500 text-sm mt-1">{{ imageError }}</p>
            <span v-if="errors.image" class="text-red-500 text-sm">{{ errors.image }}</span>
          </fieldset>
          <button 
            type="submit" 
            class="btn"
            :disabled="isSubmitting"
            @click="onSubmit"
          >
            {{ submitButtonText }}
          </button>
        </form>
      </template>
    </aside>
  </Teleport>
</template>

<script>
import gsap from 'gsap'
import { useSupabase } from '../utils/supabase'
import { createResourceWithTags } from '../utils/resourceQueries'

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
      showSuccessMessage: false,
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
      creatorInput: '',
      availableCreators: [],
      showCreatorSuggestions: false,
      filteredCreators: [],
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
        { value: 'sounds_kits', label: 'Sounds & Kits' },
        { value: 'sync_libraries', label: 'Sync Libraries' }
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
      },
      isDragging: false,
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
    handleDragOver(event) {
      this.isDragging = true
      event.dataTransfer.dropEffect = 'copy'
    },

    handleDragLeave() {
      this.isDragging = false
    },

    handleDrop(event) {
      this.isDragging = false
      const file = event.dataTransfer.files[0]
      if (file) {
        this.validateAndProcessImage(file)
      }
    },

    handleImageSelect(event) {
      const file = event.target.files[0]
      if (file) {
        this.validateAndProcessImage(file)
      }
    },

    validateAndProcessImage(file) {
      // Reset error state
      this.imageError = null

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.imageError = 'Please select an image file'
        return
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        this.imageError = 'Image must be less than 5MB'
        return
      }

      // Store the file
      this.imageFile = file

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          this.imagePreview = e.target.result
        } catch (error) {
          console.error('Error setting preview:', error)
          this.imageError = 'Error creating preview'
        }
      }
      reader.onerror = (error) => {
        console.error('Error reading file:', error)
        this.imageError = 'Error reading file'
      }
      reader.readAsDataURL(file)
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

        if (uploadError) throw uploadError

        // Get public URL and force HTTPS
        const { data: { publicUrl } } = this.supabase.storage
          .from('resources')
          .getPublicUrl(filePath)

        const httpsUrl = publicUrl.replace('http://', 'https://')

        // Verify URL is accessible
        try {
          const testResponse = await fetch(httpsUrl)
          if (!testResponse.ok) {
            throw new Error('URL not accessible')
          }
        } catch (error) {
          console.warn('URL verification failed, but continuing:', error)
          // Continue anyway as the image might still work
        }

        return httpsUrl

      } catch (error) {
        console.error('Error in uploadImage:', error)
        throw error
      }
    },

    async fetchTags() {
      try {
        const { data, error } = await this.supabase
          .from('tags')
          .select('name')
          .order('name')

        if (error) throw error
        
        this.availableTags = data.map(tag => tag.name)
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
      if (this.selectedTags.length >= 3) return
      const normalizedTag = tag.toLowerCase()
      if (!this.selectedTags.includes(normalizedTag)) {
        this.selectedTags.push(normalizedTag)
      }
      this.tagInput = ''
      this.showSuggestions = false
    },

    addTag() {
      if (!this.tagInput.trim() || this.selectedTags.length >= 3) return
      
      const newTag = this.tagInput.trim().toLowerCase()
      if (!this.selectedTags.includes(newTag)) {
        this.selectedTags.push(newTag)
      }
      this.tagInput = ''
      this.showSuggestions = false
    },

    removeTag(tag) {
      this.selectedTags = this.selectedTags.filter(t => t !== tag)
    },

    async fetchCreators() {
      try {
        const { data, error } = await this.supabase
          .from('creators')
          .select('name')
          .order('name')

        if (error) throw error
        
        this.availableCreators = data.map(creator => creator.name)
          .sort((a, b) => a.localeCompare(b))
      } catch (error) {
        console.error('Error fetching creators:', error)
      }
    },

    searchCreators() {
      if (!this.creatorInput) {
        this.showCreatorSuggestions = false
        return
      }

      const searchTerm = this.creatorInput.toLowerCase()
      this.filteredCreators = this.availableCreators
        .filter(creator => 
          creator.toLowerCase().includes(searchTerm)
        )
      this.showCreatorSuggestions = true
    },

    selectCreator(creator) {
      this.creatorInput = creator
      this.formData.creator = creator
      this.showCreatorSuggestions = false
    },

    async submitResource() {
      try {
        this.isSubmitting = true
        console.log('Starting resource submission...')
        
        // Upload image first if one is selected
        let imageUrl = null
        if (this.imageFile) {
          imageUrl = await this.uploadImage()
        }

        // Use the createResourceWithTags function instead of direct submission
        const resourceData = {
          name: this.formData.name,
          creator: this.creatorInput,
          price: this.formData.price,
          link: this.formData.link,
          image_url: imageUrl,
          os: this.selectedOS,
          type: this.formData.type
        }

        console.log('Resource data:', resourceData)
        console.log('Selected tags:', this.selectedTags)

        await createResourceWithTags(resourceData, this.selectedTags)
        console.log('Resource created successfully')

        // Show success message
        this.showSuccessMessage = true
        
        // Reset form in background
        this.resetForm()
        // Re-show success message since resetForm clears it
        this.showSuccessMessage = true

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

        // Handle image update if needed
        if (this.imageFile) {
          // Delete old image if it exists
          if (this.resourceToEdit.image_url) {
            const oldPath = this.resourceToEdit.image_url
              .split('resource-images/')[1]
            
            if (oldPath) {
              await this.supabase.storage
                .from('resources')
                .remove([`resource-images/${oldPath}`])
            }
          }
          
          // Upload new image
          imageUrl = await this.uploadImage()
        }

        // 1. Update the resource
        const { data: updatedResource, error: resourceError } = await this.supabase
          .from('resources')
          .update({
            name: this.formData.name,
            creator: this.formData.creator,
            price: this.formData.price,
            link: this.formData.link,
            image_url: imageUrl,
            os: this.selectedOS,
            type: 'software'
          })
          .eq('id', this.resourceToEdit.id)
          .select()
          .single()

        if (resourceError) throw resourceError

        // 2. Delete existing tag relationships
        const { error: deleteError } = await this.supabase
          .from('resource_tags')
          .delete()
          .eq('resource_id', this.resourceToEdit.id)

        if (deleteError) throw deleteError

        // 3. Create new tags and relationships
        const tagPromises = this.selectedTags.map(async (tagName) => {
          const { data: tag, error: tagError } = await this.supabase
            .from('tags')
            .upsert({ name: tagName.toLowerCase() }, { onConflict: 'name' })
            .select()
            .single()

          if (tagError) throw tagError
          return tag
        })

        const resolvedTags = await Promise.all(tagPromises)

        // 4. Create new resource_tags relationships
        if (resolvedTags.length > 0) {
          const resourceTagsData = resolvedTags.map(tag => ({
            resource_id: this.resourceToEdit.id,
            tag_id: tag.id
          }))

          const { error: relationError } = await this.supabase
            .from('resource_tags')
            .insert(resourceTagsData)

          if (relationError) throw relationError
        }

        // Emit event to refresh Database.vue
        this.$emit('resource-updated')
        
        // Close modal with animation
        this.animateOut()

      } catch (error) {
        console.error('Error updating resource:', error)
        alert(`Failed to update resource: ${error.message}`)
      } finally {
        this.isSubmitting = false
      }
    },

    resetAndShowForm() {
      this.showSuccessMessage = false
      // Form is already reset from previous submission
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
      this.creatorInput = ''
      this.selectedTags = []
      this.selectedOS = []
      this.imageFile = null
      this.imagePreview = null
      this.imageError = null
      this.showSuccessMessage = false
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
      if (!this.creatorInput.trim()) {
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
    async onSubmit(e) {
      e.preventDefault();
      
      //ebm edit
      // Step 1: Remove all leading $ signs
      this.formData.price = this.formData.price.replace(/^\$+/, '');
      
      // Step 2: Prepend a single $ sign
      this.formData.price = '$' + this.formData.price;
      
      if (!this.validateForm()) {
        return
      }

      console.log('Form submitted', this.editMode ? 'update' : 'create')
      try {
        if (this.editMode) {
          await this.updateResource()
        } else {
          await this.submitResource()
        }
      } catch (error) {
        console.error('Error in form submission:', error)
      }
    },
  },
  mounted() {
    this.fetchTags()
    this.fetchCreators()
    if (this.show) {
      this.$nextTick(() => {
        this.animateIn()
      })
    }
  }
}
</script>

