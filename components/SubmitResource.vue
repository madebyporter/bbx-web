<template>
  <Teleport to="body">
    <aside 
      v-if="props.show" 
      ref="modal"
      class="modal"
      :style="{ transform: `translateX(${initialX}%)`, opacity: modalOpacity }"
      @click="handleModalBackdropClick"
    >
      <div 
        class="modal-content"
        @click.stop
      >
        <div 
          @click="handleClose" 
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
            class="text-amber-300 hover:text-amber-400 underline mt-4 cursor-pointer"
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
                  :key="type.id"
                  class="flex items-center gap-2 cursor-pointer"
                >
                  <input 
                    type="radio" 
                    :value="type.id" 
                    v-model="formData.type_id"
                    class="hidden" 
                  />
                  <div 
                    class="px-3 py-2 rounded-md flex items-center gap-2"
                    :class="[
                      formData.type_id === type.id 
                        ? 'tag-active' 
                        : 'tag'
                    ]"
                  >
                    <span>{{ type.display_name }}</span>
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
                class="image-drop-zone relative w-full min-h-[522px] lg:w-full lg:h-full transition-colors duration-200"
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
                  class="absolute inset-0 border border-neutral-800 hover:border-neutral-700 rounded-md flex items-center justify-center overflow-hidden z-10 aspect-square"
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
      </div>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { createResourceWithTags, fetchResourceTypes, type ResourceType } from '../utils/resourceQueries'
import gsap from 'gsap'

interface Props {
  show: boolean
  editMode?: boolean
  resourceToEdit?: ResourceToEdit | null
}

const props = withDefaults(defineProps<Props>(), {
  editMode: false,
  resourceToEdit: null
})

const emit = defineEmits(['resource-updated', 'update:show', 'resourceAdded'])

interface Creator {
  name: string;
}

interface ResourceToEdit {
  id: number;
  name: string;
  creator: string;
  price: string;
  link: string;
  image_url: string | null;
  os: string[];
  tags: string[];
  type: ResourceType;
}

interface Resource {
  name: string;
  creator_id: number;
  price: string;
  link: string;
  image_url?: string;
  os: string[];
  type_id: number;
  type?: ResourceType;
}

interface Tag {
  id: number;
  name: string;
}

const { supabase } = useSupabase()

const initialX = ref(100)
const modalOpacity = ref(0)
const modal = ref<HTMLElement | null>(null)
const showSuccessMessage = ref(false)
const isSubmitting = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const imageError = ref<string | null>(null)
const creatorInput = ref('')
const availableCreators = ref<string[]>([])
const showCreatorSuggestions = ref(false)
const filteredCreators = ref<string[]>([])
const tagInput = ref('')
const selectedTags = ref<string[]>([])
const availableTags = ref<string[]>([])
const showSuggestions = ref(false)
const filteredTags = ref<string[]>([])
const selectedOS = ref<string[]>([])
const resourceTypes = ref<ResourceType[]>([])

const errors = ref({
  name: '',
  creator: '',
  tags: '',
  price: '',
  os: '',
  link: '',
  image: '',
  type: ''
})

const isDragging = ref(false)

const submitButtonText = computed(() => {
  if (isSubmitting.value) return 'Submitting...'
  return props.editMode ? 'Update' : 'Submit'
})

const formData = ref({
  name: '',
  type_id: undefined as number | undefined,
  creator: '',
  price: '',
  link: '',
  image_url: '',
  os: [] as string[]
})

// Fetch resource types on mount
onMounted(async () => {
  resourceTypes.value = await fetchResourceTypes()
})

// Watch for resourceToEdit changes to populate form data
watch(() => props.resourceToEdit, (newResource) => {
  if (newResource && props.editMode) {
    // Populate form data
    formData.value = {
      name: newResource.name,
      type_id: newResource.type?.id,
      creator: newResource.creator,
      price: newResource.price,
      link: newResource.link,
      image_url: newResource.image_url || '',
      os: newResource.os
    }
    
    // Set other form fields
    creatorInput.value = newResource.creator
    selectedOS.value = newResource.os
    selectedTags.value = newResource.tags || []
    
    // Set image preview if there's an image
    if (newResource.image_url) {
      imagePreview.value = newResource.image_url
    }
  }
}, { immediate: true })

// Update the watch to handle both opening and closing
watch(() => props.show, (newVal, oldVal) => {
  if (newVal) {
    // When opening, start from 100% and animate in
    initialX.value = 100
    nextTick(() => {
      animateIn()
    })
  } else if (oldVal) {
    // Only animate out if it was previously shown
    animateOut()
  }
}, { immediate: true })

const resetForm = () => {
  // Only reset if we're not showing success message
  if (!showSuccessMessage.value) {
    formData.value = {
      name: '',
      type_id: undefined,
      creator: '',
      price: '',
      link: '',
      image_url: '',
      os: []
    }
    selectedTags.value = []
    imageFile.value = null
    imagePreview.value = null
    imageError.value = null
    errors.value = {
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
}

const animateIn = () => {
  if (!modal.value) return
  modalOpacity.value = 1
  gsap.to(modal.value, {
    duration: 0.3,
    x: 0,
    ease: 'power2.out',
    onComplete: () => {
      initialX.value = 0
    }
  })
}

const animateOut = () => {
  if (!modal.value) return
  
  // First animate out
  gsap.to(modal.value, {
    duration: 0.3,
    x: '100%',
    opacity: 0,
    ease: 'power2.in',
    onComplete: () => {
      // Only reset form if we're not showing success message
      if (!showSuccessMessage.value) {
        resetForm()
      }
      emit('update:show', false)
      // Reset position for next open
      initialX.value = 100
      modalOpacity.value = 0
    }
  })
}

const handleClose = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  animateOut()
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  if (event.dataTransfer?.files.length) {
    const file = event.dataTransfer.files[0]
    validateAndProcessImage(file)
  }
}

const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target?.files?.[0]) {
    validateAndProcessImage(target.files[0])
  }
}

const validateAndProcessImage = (file: File) => {
  // Reset error state
  imageError.value = null

  // Validate file type
  if (!file.type.startsWith('image/')) {
    imageError.value = 'Please select an image file'
    return
  }

  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    imageError.value = 'Image must be less than 5MB'
    return
  }

  // Store the file
  imageFile.value = file

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const result = e.target?.result
      if (typeof result === 'string') {
        imagePreview.value = result
      } else {
        throw new Error('Invalid image data')
      }
    } catch (error) {
      console.error('Error setting preview:', error)
      imageError.value = 'Error creating preview'
    }
  }
  reader.onerror = (error) => {
    console.error('Error reading file:', error)
    imageError.value = 'Error reading file'
  }
  reader.readAsDataURL(file)
}

const uploadImage = async () => {
  if (!imageFile.value || !supabase) return null

  try {
    const fileExt = imageFile.value.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `resource-images/${fileName}`

    // Upload the file
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('resources')
      .upload(filePath, imageFile.value, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Image upload error:', uploadError)
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resources')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error in uploadImage:', error)
    throw error
  }
}

const fetchTags = async () => {
  if (!supabase) return

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('name')
      .order('name')

    if (error) throw error
    
    availableTags.value = (data as { name: string }[])
      .map(tag => tag.name)
      .sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.error('Error fetching tags:', error)
  }
}

const searchTags = () => {
  if (!tagInput.value) {
    showSuggestions.value = false
    return
  }

  const searchTerm = tagInput.value.toLowerCase()
  filteredTags.value = availableTags.value
    .filter((tag: string) => 
      tag.toLowerCase().includes(searchTerm) && 
      !selectedTags.value.includes(tag)
    )
  showSuggestions.value = true
}

const selectTag = (tag: string) => {
  if (selectedTags.value.length >= 3) return
  const normalizedTag = tag.toLowerCase()
  if (!selectedTags.value.includes(normalizedTag)) {
    selectedTags.value.push(normalizedTag)
  }
  tagInput.value = ''
  showSuggestions.value = false
}

const addTag = () => {
  if (!tagInput.value.trim() || selectedTags.value.length >= 3) return
  
  const newTag = tagInput.value.trim().toLowerCase()
  if (!selectedTags.value.includes(newTag)) {
    selectedTags.value.push(newTag)
  }
  tagInput.value = ''
  showSuggestions.value = false
}

const removeTag = (tag: string) => {
  selectedTags.value = selectedTags.value.filter(t => t !== tag)
}

const fetchCreators = async () => {
  if (!supabase) return

  try {
    const { data, error } = await supabase
      .from('creators')
      .select('name')
      .order('name')

    if (error) throw error
    
    availableCreators.value = (data as Creator[])
      .map(creator => creator.name)
      .sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.error('Error fetching creators:', error)
  }
}

const searchCreators = () => {
  if (!creatorInput.value) {
    showCreatorSuggestions.value = false
    return
  }

  const searchTerm = creatorInput.value.toLowerCase()
  filteredCreators.value = availableCreators.value
    .filter(creator => 
      creator.toLowerCase().includes(searchTerm)
    )
  showCreatorSuggestions.value = true
}

const selectCreator = (creator: string) => {
  creatorInput.value = creator
  formData.value.creator = creator
  showCreatorSuggestions.value = false
}

const submitResource = async () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    isSubmitting.value = true
    
    // Upload image first if one is selected
    let imageUrl: string | null = null
    if (imageFile.value) {
      imageUrl = await uploadImage()
    }

    // Get creator_id from creator name
    const { data: creatorData, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('name', creatorInput.value)
      .single()

    if (creatorError) {
      console.error('Error finding creator:', creatorError)
      throw new Error('Could not find creator')
    }

    if (!creatorData) {
      throw new Error('Creator not found')
    }

    // Use the createResourceWithTags function instead of direct submission
    const resourceData: Partial<Resource> = {
      name: formData.value.name,
      creator_id: creatorData.id as number,
      price: formData.value.price,
      link: formData.value.link,
      image_url: imageUrl || undefined,
      os: selectedOS.value,
      type_id: formData.value.type_id
    }

    await createResourceWithTags(resourceData, selectedTags.value)

    // Show success message and animate out
    showSuccessMessage.value = true
    
    // Emit events
    emit('resource-updated')
    emit('resourceAdded')
    
    // Animate out after successful submission
    animateOut()

  } catch (error) {
    console.error('Error submitting resource:', error)
    if (error instanceof Error) {
      alert(`Failed to submit resource: ${error.message}`)
    } else {
      alert('Failed to submit resource. Please try again.')
    }
  } finally {
    isSubmitting.value = false
  }
}

const updateResource = async () => {
  const currentResource = props.resourceToEdit
  if (!currentResource || !supabase) {
    throw new Error('Resource or Supabase client not initialized')
  }

  try {
    isSubmitting.value = true
    
    let imageUrl = currentResource.image_url

    // Handle image update if needed
    if (imageFile.value) {
      // Delete old image if it exists
      if (currentResource.image_url) {
        const oldPath = currentResource.image_url
          .split('resource-images/')[1]
        
        if (oldPath) {
          await supabase.storage
            .from('resources')
            .remove([`resource-images/${oldPath}`])
        }
      }
      
      // Upload new image
      imageUrl = await uploadImage()
    }

    // Get creator_id from creator name
    const { data: creatorData, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('name', formData.value.creator)
      .single()

    if (creatorError) {
      console.error('Error finding creator:', creatorError)
      throw new Error('Could not find creator')
    }

    if (!creatorData) {
      throw new Error('Creator not found')
    }

    // 1. Update the resource
    const { data: updatedResource, error: resourceError } = await supabase
      .from('resources')
      .update({
        name: formData.value.name,
        creator_id: creatorData.id as number,
        price: formData.value.price,
        link: formData.value.link,
        image_url: imageUrl,
        os: selectedOS.value,
        type_id: formData.value.type_id
      })
      .eq('id', currentResource.id)
      .select()
      .single()

    if (resourceError) {
      console.error('Resource update error:', resourceError)
      throw resourceError
    }

    // 2. Delete existing tag relationships
    const { error: deleteError } = await supabase
      .from('resource_tags')
      .delete()
      .eq('resource_id', currentResource.id)

    if (deleteError) throw deleteError

    // 3. Create new tags and relationships
    const tagPromises = selectedTags.value.map(async (tagName) => {
      const { data: tag, error: tagError } = await supabase
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
        resource_id: currentResource.id,
        tag_id: tag.id
      }))

      const { error: relationError } = await supabase
        .from('resource_tags')
        .insert(resourceTagsData)

      if (relationError) throw relationError
    }

    // Emit event to refresh Database.vue
    emit('resource-updated')
    
    // Close modal with animation
    animateOut()

  } catch (error) {
    console.error('Error updating resource:', error)
    if (error instanceof Error) {
      alert(`Failed to update resource: ${error.message}`)
    } else {
      alert('Failed to update resource. Please try again.')
    }
  } finally {
    isSubmitting.value = false
  }
}

const resetAndShowForm = () => {
  showSuccessMessage.value = false
  resetForm()
}

const validateForm = () => {
  let isValid = true
  errors.value = {
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
  if (!formData.value.name.trim()) {
    errors.value.name = 'Name is required'
    isValid = false
  }

  // Creator validation
  if (!creatorInput.value.trim()) {
    errors.value.creator = 'Creator is required'
    isValid = false
  }

  // Tags validation
  if (selectedTags.value.length === 0) {
    errors.value.tags = 'At least one tag is required'
    isValid = false
  }

  // Price validation
  if (!formData.value.price.trim()) {
    errors.value.price = 'Price is required'
    isValid = false
  }

  // OS validation
  if (selectedOS.value.length === 0) {
    errors.value.os = 'At least one operating system is required'
    isValid = false
  }

  // Link validation
  if (!formData.value.link.trim()) {
    errors.value.link = 'Link is required'
    isValid = false
  } else if (!formData.value.link.startsWith('http')) {
    errors.value.link = 'Please enter a valid URL starting with http:// or https://'
    isValid = false
  }

  // Image validation
  if (!imageFile.value && !formData.value.image_url) {
    errors.value.image = 'Image is required'
    isValid = false
  }

  // Type validation
  if (!formData.value.type_id) {
    errors.value.type = 'Type is required'
    isValid = false
  }

  return isValid
}

const onSubmit = async (e: Event) => {
  e.preventDefault();
  
  //ebm edit
  // Step 1: Remove all leading $ signs
  formData.value.price = formData.value.price.replace(/^\$+/, '');
  
  // Step 2: Prepend a single $ sign
  formData.value.price = '$' + formData.value.price;
  
  if (!validateForm()) {
    return
  }
  try {
    if (props.editMode) {
      await updateResource()
    } else {
      await submitResource()
    }
  } catch (error) {
    console.error('Error in form submission:', error)
  }
}

const handleModalBackdropClick = (e: Event) => {
  // Only close if clicking the backdrop (modal wrapper), not the content
  if (e.target === modal.value) {
    handleClose(e)
  }
}

onMounted(() => {
  fetchTags()
  fetchCreators()
  if (props.show) {
    animateIn()
  }
})
</script>

