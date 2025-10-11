<template>
  <MasterDrawer :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Upload Music</h2>
    </template>

    <!-- Success Message -->
    <div v-if="showSuccessMessage" class="h-full flex flex-col items-center justify-center text-center gap-4">
      <h2 class="text-xl">Upload successful!</h2>
      <p class="text-neutral-600">{{ uploadedCount }} track(s) uploaded to your library.</p>
      <button 
        @click="resetAndShowForm" 
        class="text-amber-300 hover:text-amber-400 underline mt-4 cursor-pointer"
      >
        Upload more tracks
      </button>
    </div>

    <!-- Upload Form -->
    <template v-else>
      <form class="flex flex-col gap-8" @submit.prevent="onSubmit" @click.stop>
        <!-- Drag & Drop Zone -->
        <fieldset class="flex flex-col gap-2">
          <label class="flex items-center gap-1">
            MP3 Files
            <span class="text-red-500">*</span>
          </label>
          <div
            @drop.prevent="handleDrop"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            :class="[
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors min-h-[200px] flex items-center justify-center',
              isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-700 hover:border-neutral-600'
            ]"
          >
            <input
              ref="fileInput"
              type="file"
              accept="audio/mpeg,audio/mp3,.mp3"
              multiple
              class="hidden"
              @change="handleFileSelect"
            />
            <div class="flex flex-col items-center gap-4">
              <svg class="w-12 h-12 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <div>
                <p class="text-lg font-medium">{{ isDragging ? 'Drop files here' : 'Drag & drop MP3 files here' }}</p>
                <p class="text-sm text-neutral-500 mt-1">or <button type="button" @click="$refs.fileInput.click()" class="text-amber-400 hover:text-amber-300">browse</button></p>
                <p class="text-xs text-neutral-600 mt-2">Maximum 50MB per file</p>
              </div>
            </div>
          </div>
          <span v-if="errors.files" class="text-red-500 text-sm">{{ errors.files }}</span>
        </fieldset>

        <!-- Selected Files List -->
        <div v-if="selectedFiles.length > 0" class="flex flex-col gap-4">
          <h3 class="font-semibold">Selected Files ({{ selectedFiles.length }})</h3>
          <div class="space-y-3 max-h-[400px] overflow-y-auto">
            <div 
              v-for="(file, index) in selectedFiles" 
              :key="index"
              class="p-4 bg-neutral-800 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-sm truncate flex-1">{{ file.file.name }}</span>
                <button 
                  type="button"
                  @click="removeFile(index)"
                  class="text-red-500 hover:text-red-400 ml-2"
                  :disabled="isUploading"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <!-- Upload Progress -->
              <div v-if="file.progress > 0 && file.progress < 100" class="w-full bg-neutral-700 rounded-full h-2 mb-3">
                <div 
                  class="bg-blue-500 h-2 rounded-full transition-all"
                  :style="{ width: `${file.progress}%` }"
                ></div>
              </div>

              <!-- Metadata Fields -->
              <div class="flex flex-col gap-3 mt-3">
                <!-- Title (full width) -->
                <div>
                  <label class="text-xs text-neutral-400">Title <span class="text-red-500">*</span></label>
                  <input 
                    v-model="file.metadata.title"
                    type="text"
                    required
                    class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                    :disabled="isUploading"
                  />
                </div>
                
                <!-- Other fields in grid -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-neutral-400">Artist</label>
                    <input 
                      v-model="file.metadata.artist"
                      type="text"
                      class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                      :disabled="isUploading"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-neutral-400">Version</label>
                    <input 
                      v-model="file.metadata.version"
                      type="text"
                      placeholder="e.g. v1.0, v2.5"
                      class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                      :disabled="isUploading"
                    />
                  </div>
                <div class="col-span-2">
                  <label class="text-xs text-neutral-400">Collections (optional)</label>
                  <select 
                    multiple
                    v-model="file.selectedCollectionIds"
                    class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 min-h-[80px]"
                    :disabled="isUploading"
                  >
                    <option v-for="c in collections" :key="c.id" :value="c.id">
                      {{ c.name }}
                    </option>
                  </select>
                  <p class="text-xs text-neutral-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  
                  <button 
                    type="button"
                    @click="showCreateCollection = !showCreateCollection"
                    class="text-xs text-amber-400 hover:text-amber-300 mt-2"
                    :disabled="isUploading"
                  >
                    {{ showCreateCollection ? '- Cancel' : '+ Create New Collection' }}
                  </button>
                  
                  <div v-if="showCreateCollection" class="mt-3 p-3 border border-neutral-700 rounded bg-neutral-900/50">
                    <div class="flex flex-col gap-2">
                      <input 
                        v-model="newCollection.name"
                        type="text"
                        placeholder="Collection name (required)"
                        class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                        :disabled="isUploading"
                      />
                      <textarea 
                        v-model="newCollection.description"
                        placeholder="Description (optional)"
                        rows="2"
                        class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                        :disabled="isUploading"
                      />
                      <button 
                        type="button"
                        @click="createCollection"
                        class="btn-sm self-start"
                        :disabled="isUploading || !newCollection.name.trim()"
                      >
                        Create & Select
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="text-xs text-neutral-400">Genre</label>
                  <input 
                    v-model="file.metadata.genre"
                    type="text"
                    class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                    :disabled="isUploading"
                  />
                </div>
                <div>
                  <label class="text-xs text-neutral-400">BPM</label>
                  <input 
                    v-model.number="file.metadata.bpm"
                    type="number"
                    class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                    :disabled="isUploading"
                  />
                </div>
                <div>
                  <label class="text-xs text-neutral-400">Year</label>
                  <input 
                    v-model.number="file.metadata.year"
                    type="number"
                    class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                    :disabled="isUploading"
                  />
                </div>
                  <div>
                    <label class="text-xs text-neutral-400">Mood</label>
                    <input 
                      v-model="file.metadata.mood"
                      type="text"
                      placeholder="e.g. Dark, Happy"
                      class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                      :disabled="isUploading"
                    />
                  </div>
                </div>
              </div>

              <!-- File Info -->
              <div class="mt-2 text-xs text-neutral-500 flex items-center gap-4">
                <span>{{ formatFileSize(file.file.size) }}</span>
                <span v-if="file.duration">{{ formatDuration(file.duration) }}</span>
              </div>

              <!-- Error Message -->
              <div v-if="file.error" class="mt-2 text-xs text-red-500">
                {{ file.error }}
              </div>
            </div>
          </div>
        </div>

        <!-- Upload Button -->
        <button 
          type="submit" 
          class="btn"
          :disabled="isUploading || selectedFiles.length === 0"
        >
          {{ uploadButtonText }}
        </button>

        <!-- Global Errors -->
        <div v-if="globalError" class="text-red-500 text-sm">
          {{ globalError }}
        </div>
      </form>
    </template>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import MasterDrawer from './MasterDrawer.vue'
import { generateSlug, generateUniqueSlug } from '~/utils/collections'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['update:show', 'music-uploaded'])

interface FileMetadata {
  title: string
  artist: string
  version: string
  collection_name: string
  genre: string
  mood: string
  bpm: number | null
  year: number | null
}

interface SelectedFile {
  file: File
  metadata: FileMetadata
  selectedCollectionIds: number[]
  duration: number | null
  progress: number
  error: string | null
}

interface Collection {
  id: number
  name: string
  slug: string
}

const { supabase } = useSupabase()
const { user } = useAuth()

const isDragging = ref(false)
const selectedFiles = ref<SelectedFile[]>([])
const isUploading = ref(false)
const showSuccessMessage = ref(false)
const uploadedCount = ref(0)
const collections = ref<Collection[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const globalError = ref<string | null>(null)
const showCreateCollection = ref(false)
const newCollection = ref({
  name: '',
  description: ''
})

const errors = ref({
  files: ''
})

const uploadButtonText = computed(() => {
  if (isUploading.value) {
    const completed = selectedFiles.value.filter(f => f.progress === 100).length
    return `Uploading... (${completed}/${selectedFiles.value.length})`
  }
  return `Upload ${selectedFiles.value.length} track${selectedFiles.value.length !== 1 ? 's' : ''}`
})

const createCollection = async () => {
  if (!supabase || !user.value || !newCollection.value.name.trim()) return
  
  try {
    // Get existing slugs to ensure uniqueness
    const { data: existing } = await supabase
      .from('collections')
      .select('slug')
      .eq('user_id', user.value.id)
    
    const existingSlugs = (existing || []).map(c => c.slug)
    const slug = generateUniqueSlug(newCollection.value.name, existingSlugs)
    
    // Create the collection
    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.value.id,
        name: newCollection.value.name.trim(),
        description: newCollection.value.description.trim() || null,
        slug
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Add to collections list
    collections.value.push({
      id: data.id,
      name: data.name,
      slug: data.slug
    })
    
    // Auto-select the new collection for all files
    selectedFiles.value.forEach(file => {
      if (!file.selectedCollectionIds.includes(data.id)) {
        file.selectedCollectionIds.push(data.id)
      }
    })
    
    // Reset form
    newCollection.value.name = ''
    newCollection.value.description = ''
    showCreateCollection.value = false
    
  } catch (error: any) {
    console.error('Error creating collection:', error)
    globalError.value = 'Failed to create collection: ' + error.message
  }
}

// Fetch collections on mount
onMounted(async () => {
  if (!supabase || !user.value) return
  
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, slug')
      .eq('user_id', user.value.id)
      .order('name')
    
    if (error) throw error
    collections.value = data || []
  } catch (error) {
    console.error('Error fetching collections:', error)
    // Don't block upload if collections fail to load
    collections.value = []
  }
})

const getDuration = (audio: HTMLAudioElement): Promise<number> => {
  return new Promise((resolve) => {
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration)
    })
    audio.addEventListener('error', () => {
      resolve(0)
    })
  })
}

const validateFile = (file: File): string | null => {
  // Check file type
  if (!file.type.match(/audio\/(mpeg|mp3)/) && !file.name.toLowerCase().endsWith('.mp3')) {
    return 'Only MP3 files are allowed'
  }
  
  // Check file size (50MB)
  if (file.size > 50 * 1024 * 1024) {
    return 'File size must be less than 50MB'
  }
  
  return null
}

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  await processFiles(files)
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  await processFiles(files)
  // Reset input
  if (target) target.value = ''
}

const processFiles = async (files: File[]) => {
  errors.value.files = ''
  
  for (const file of files) {
    const error = validateFile(file)
    
    if (error) {
      errors.value.files = error
      continue
    }
    
    // Extract duration
    const audio = new Audio(URL.createObjectURL(file))
    const duration = await getDuration(audio)
    URL.revokeObjectURL(audio.src)
    
    // Extract title from filename (remove extension)
    const title = file.name.replace(/\.[^/.]+$/, '')
    
    selectedFiles.value.push({
      file,
      metadata: {
        title,
        artist: '',
        version: 'v1.0',
        collection_name: '', // Keep for backwards compatibility but not used
        genre: '',
        mood: '',
        bpm: null,
        year: null
      },
      selectedCollectionIds: [],
      duration,
      progress: 0,
      error: null
    })
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds === 0) return ''
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const uploadFile = async (fileData: SelectedFile): Promise<boolean> => {
  if (!supabase || !user.value) {
    fileData.error = 'Not authenticated'
    return false
  }
  
  try {
    fileData.progress = 10
    
    // Generate file path
    const timestamp = Date.now()
    const filePath = `${user.value.id}/${timestamp}-${fileData.file.name}`
    
    // Upload to storage
    fileData.progress = 30
    const { error: uploadError } = await supabase.storage
      .from('sounds')
      .upload(filePath, fileData.file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) throw uploadError
    
    fileData.progress = 60
    
    // Parse mood (comma-separated to array)
    const moodArray = fileData.metadata.mood 
      ? fileData.metadata.mood.split(',').map(m => m.trim()).filter(m => m)
      : null
    
    // Save to sounds table and get the sound_id
    const { data: soundData, error: dbError } = await supabase
      .from('sounds')
      .insert({
        user_id: user.value.id,
        storage_path: filePath,
        title: fileData.metadata.title || null,
        artist: fileData.metadata.artist || null,
        version: fileData.metadata.version || 'v1.0',
        file_size: fileData.file.size,
        duration: fileData.duration,
        genre: fileData.metadata.genre || null,
        mood: moodArray,
        bpm: fileData.metadata.bpm,
        year: fileData.metadata.year
      })
      .select('id')
      .single()
    
    if (dbError) throw dbError
    
    // Add to collections if any are selected
    if (fileData.selectedCollectionIds && fileData.selectedCollectionIds.length > 0) {
      const collectionsToInsert = fileData.selectedCollectionIds.map(collectionId => ({
        collection_id: collectionId,
        sound_id: soundData.id
      }))
      
      const { error: junctionError } = await supabase
        .from('collections_sounds')
        .insert(collectionsToInsert)
      
      if (junctionError) {
        console.error('Error adding to collections:', junctionError)
        // Don't fail the upload if collection assignment fails
      }
    }
    
    fileData.progress = 100
    return true
    
  } catch (error: any) {
    console.error('Upload error:', error)
    fileData.error = error.message || 'Upload failed'
    return false
  }
}

const onSubmit = async () => {
  if (selectedFiles.value.length === 0 || !user.value) return
  
  isUploading.value = true
  globalError.value = null
  let successCount = 0
  
  try {
    // Upload files sequentially
    for (const fileData of selectedFiles.value) {
      const success = await uploadFile(fileData)
      if (success) successCount++
    }
    
    if (successCount > 0) {
      uploadedCount.value = successCount
      showSuccessMessage.value = true
      emit('music-uploaded')
    } else {
      globalError.value = 'All uploads failed. Please try again.'
    }
    
  } catch (error) {
    console.error('Error during upload:', error)
    globalError.value = 'An error occurred during upload'
  } finally {
    isUploading.value = false
  }
}

const resetAndShowForm = () => {
  showSuccessMessage.value = false
  selectedFiles.value = []
  errors.value.files = ''
  globalError.value = null
}
</script>

