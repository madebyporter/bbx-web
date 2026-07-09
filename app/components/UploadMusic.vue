<template>
  <MasterDrawer :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <div
        class="grow flex items-center justify-between h-[50px] border border-dashed rounded p-2 cursor-pointer transition-colors"
        :class="isDragging ? 'border-[#e6b85b] bg-[#e6b85b]/10' : 'border-[#e6b85b]'"
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept="audio/mpeg,audio/mp3,.mp3,audio/mp4,audio/x-m4a,.m4a"
          multiple
          class="hidden"
          @change="handleFileSelect"
        />
        <p class="px-2 text-sm font-semibold text-white whitespace-nowrap">
          <template v-if="isDragging">Drop files here</template>
          <template v-else>
            Drop MP3/M4A files here or <span class="text-[#e6b85b]">click to browse</span>
          </template>
        </p>
        <div class="bg-[#262626] rounded-sm p-1 h-full flex flex-col items-center justify-center shrink-0 min-w-[37px]">
          <span class="text-xs font-semibold text-white leading-none">50MB</span>
          <span class="text-xs font-semibold text-[#999] tracking-[2.5px] leading-none">MAX</span>
          <span class="text-[5px] font-semibold text-[#999] tracking-[1.2px] leading-none">PER FILE</span>
        </div>
      </div>
    </template>

    <!-- Success Message -->
    <div v-if="showSuccessMessage" class="h-full flex flex-col items-center justify-center text-center gap-4">
      <h2 class="text-xl">Upload successful!</h2>
      <p class="text-neutral-600">{{ uploadedCount }} track(s) uploaded to your library.</p>
      <button
        type="button"
        class="text-link mt-4 text-amber-300 hover:text-amber-400 no-underline"
        @click="resetAndShowForm"
      >
        Upload more tracks
      </button>
    </div>

    <!-- Upload Form -->
    <template v-else>
      <form
        class="grow flex flex-col justify-between min-h-0"
        @submit.prevent="onSubmit"
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
      >
        <div class="flex flex-col gap-2 overflow-y-auto grow pb-2">
          <span v-if="errors.files" class="text-red-500 text-xs px-2">{{ errors.files }}</span>

          <!-- Zero state placeholder / alternate drop zone -->
          <div
            v-if="selectedFiles.length === 0"
            class="border border-dashed divide-y divide-dashed rounded h-[356px] flex flex-col shrink-0 w-full cursor-pointer transition-colors"
            :class="isDragging ? 'border-[#e6b85b] divide-[#e6b85b] bg-[#e6b85b]/5' : 'border-neutral-800 hover:border-neutral-700 divide-neutral-800 hover:divide-neutral-700'"
            @drop.prevent="handleDrop"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @click="fileInput?.click()"
          >
            <div class="flex items-start gap-2 p-2 pointer-events-none">
              <span class="flex-1 min-w-0 px-2 text-xs font-semibold text-transparent truncate self-center select-none" aria-hidden="true">
                Track filename.mp3
              </span>
              <div class="flex items-center gap-2 px-2 text-xs font-semibold text-transparent shrink-0 self-center whitespace-nowrap select-none" aria-hidden="true">
                <span>0:00</span>
                <span>|</span>
                <span>0 MB</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  class="size-6 flex items-center justify-center rounded-sm bg-[#3b3b3b] opacity-50 cursor-default"
                  disabled
                  tabindex="-1"
                  aria-hidden="true"
                >
                  <svg class="size-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="size-6 flex items-center justify-center rounded-sm bg-[#5c1a1a] opacity-50 cursor-default"
                  disabled
                  tabindex="-1"
                  aria-hidden="true"
                >
                  <svg class="size-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="flex-1 flex items-center justify-center p-4 pointer-events-none">
              <p class="text-sm font-semibold text-center text-neutral-500">
                <template v-if="isDragging">Drop files here</template>
                <template v-else>
                  Drop MP3/M4A files here or <span class="text-[#e6b85b]">click to browse</span>
                </template>
              </p>
            </div>
          </div>

          <div
            v-for="(file, index) in selectedFiles"
            :key="index"
            class="bg-neutral-800/30 rounded flex flex-col gap-1"
          >
            <!-- Card header -->
            <div class="flex items-start gap-2 p-2">
              <span class="flex-1 min-w-0 px-2 text-xs font-semibold text-[#ccc] truncate self-center">
                {{ file.file.name }}
              </span>
              <div class="flex items-center gap-2 px-2 text-xs font-semibold text-[#ccc] shrink-0 self-center whitespace-nowrap">
                <span v-if="file.duration">{{ formatDuration(file.duration) }}</span>
                <span class="text-[#3b3b3b]">|</span>
                <span>{{ formatFileSize(file.file.size) }}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <input
                  :ref="(el) => setReuploadInput(index, el as HTMLInputElement | null)"
                  type="file"
                  accept="audio/mpeg,audio/mp3,.mp3,audio/mp4,audio/x-m4a,.m4a"
                  class="hidden"
                  :disabled="isUploading"
                  @change="(e) => handleReupload(e, index)"
                />
                <button
                  type="button"
                  class="size-6 flex items-center justify-center rounded-sm bg-[#3b3b3b] hover:bg-neutral-600 disabled:opacity-50 cursor-pointer"
                  :disabled="isUploading"
                  title="Replace file"
                  @click="triggerReupload(index)"
                >
                  <svg class="size-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="size-6 flex items-center justify-center rounded-sm bg-[#5c1a1a] hover:bg-red-800 disabled:opacity-50 cursor-pointer"
                  :disabled="isUploading"
                  title="Remove track"
                  @click="removeFile(index)"
                >
                  <svg class="size-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Upload Progress -->
            <div v-if="file.progress > 0 && file.progress < 100" class="mx-2 mb-1 w-auto bg-neutral-700 rounded-full h-1">
              <div class="bg-[#e6b85b] h-1 rounded-full transition-all" :style="{ width: `${file.progress}%` }"></div>
            </div>

            <!-- Artwork -->
            <div class="flex flex-col gap-2 p-2">
              <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">Artwork</label>
              <div class="flex items-start gap-2 px-2">
                <input
                  :ref="(el) => setArtworkInput(index, el as HTMLInputElement | null)"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov"
                  class="hidden"
                  :disabled="isUploading"
                  @change="(e) => handleArtworkSelect(e, index)"
                />
                <button
                  type="button"
                  class="size-16 shrink-0 rounded-sm border border-dashed border-[#3b3b3b] hover:border-neutral-600 overflow-hidden flex items-center justify-center bg-transparent disabled:opacity-50 cursor-pointer"
                  :disabled="isUploading"
                  @click="triggerArtworkSelect(index)"
                >
                  <video
                    v-if="file.artworkPreview && file.artworkIsVideo"
                    :src="file.artworkPreview"
                    autoplay
                    muted
                    loop
                    playsinline
                    class="size-full object-cover"
                  />
                  <img
                    v-else-if="file.artworkPreview"
                    :src="file.artworkPreview"
                    alt="Artwork preview"
                    class="size-full object-cover"
                  />
                  <span v-else class="text-[10px] text-[#545454] text-center px-1">Add cover</span>
                </button>
                <div class="flex flex-col gap-1 min-w-0">
                  <p class="text-[10px] text-[#545454]">
                    JPG, PNG, WebP, GIF, MP4, MOV. Max 10MB, 1600x1600.
                  </p>
                  <button
                    v-if="file.artworkFile"
                    type="button"
                    class="text-[10px] text-red-400 hover:text-red-300 text-left cursor-pointer"
                    :disabled="isUploading"
                    @click="removeArtwork(index)"
                  >
                    Remove
                  </button>
                  <p v-if="file.artworkError" class="text-[10px] text-red-500">{{ file.artworkError }}</p>
                </div>
              </div>
            </div>

            <!-- Title -->
            <div class="flex flex-col gap-2 p-2">
              <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">
                Title <span class="text-[#e53a17]">*</span>
              </label>
              <input
                v-model="file.metadata.title"
                type="text"
                required
                :class="inputClass"
                :disabled="isUploading"
              />
            </div>

            <!-- Artist -->
            <div class="flex flex-col gap-2 p-2">
              <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">Artist</label>
              <input
                v-model="file.metadata.artist"
                type="text"
                :class="inputClass"
                :disabled="isUploading"
              />
            </div>

            <!-- Group Name + Version -->
            <div class="flex gap-1">
              <div class="flex flex-col gap-2 p-2 flex-1 min-w-0">
                <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">Group Name</label>
                <input
                  v-model="file.metadata.group_name"
                  type="text"
                  placeholder="Auto-generated if empty"
                  :class="inputClass"
                  :disabled="isUploading"
                />
              </div>
              <div class="flex flex-col gap-2 p-2 w-40 shrink-0">
                <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">Version</label>
                <input
                  v-model="file.metadata.version"
                  type="text"
                  placeholder="e.g. v1.0"
                  :class="inputClass"
                  :disabled="isUploading"
                />
              </div>
            </div>

            <!-- Collection -->
            <div class="flex flex-col gap-2 p-2">
              <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">Collection</label>
              <CollectionSelect
                v-model="file.selectedCollectionIds"
                :collections="collections"
                size="sm"
                :disabled="isUploading"
                @create-collection="(name) => queueCollectionCreation(name, index)"
              />
            </div>

            <!-- Genre + Mood -->
            <div class="flex gap-1">
              <div class="flex flex-col gap-2 p-2 flex-1 min-w-0">
                <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">Genre</label>
                <input
                  v-model="file.metadata.genre"
                  type="text"
                  :class="inputClass"
                  :disabled="isUploading"
                />
              </div>
              <div class="flex flex-col gap-2 p-2 flex-1 min-w-0">
                <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">Mood</label>
                <input
                  v-model="file.metadata.mood"
                  type="text"
                  placeholder="e.g. Dark"
                  :class="inputClass"
                  :disabled="isUploading"
                />
              </div>
            </div>

            <!-- Year + Key + BPM -->
            <div class="flex gap-1">
              <div class="flex flex-col gap-2 p-2 flex-1 min-w-0">
                <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">Year</label>
                <input
                  v-model.number="file.metadata.year"
                  type="number"
                  :class="inputClass"
                  :disabled="isUploading"
                />
              </div>
              <div class="flex flex-col gap-2 p-2 flex-1 min-w-0">
                <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">Key</label>
                <input
                  v-model="file.metadata.key"
                  type="text"
                  placeholder="e.g. C Major"
                  :class="inputClass"
                  :disabled="isUploading"
                />
              </div>
              <div class="flex flex-col gap-2 p-2 flex-1 min-w-0">
                <label class="text-xs font-semibold text-[#ccc] px-2 h-3 flex items-center">BPM</label>
                <input
                  v-model.number="file.metadata.bpm"
                  type="number"
                  :class="inputClass"
                  :disabled="isUploading"
                />
              </div>
            </div>

            <!-- Error/Warning Message -->
            <div
              v-if="file.error"
              :class="[
                'px-2 pb-2 text-xs',
                file.error.startsWith('⚠️') ? 'text-amber-500' : 'text-red-500'
              ]"
            >
              {{ file.error }}
            </div>
          </div>
        </div>

        <!-- Upload Button -->
        <div class="sticky bottom-0 border-t border-[#262626] p-2 bg-neutral-900 shrink-0">
          <Button
            type="submit"
            full-width
            :disabled="isUploading || selectedFiles.length === 0"
          >
            {{ uploadButtonText }}
          </Button>
        </div>

        <!-- Global Errors -->
        <div v-if="globalError" class="text-red-500 text-sm px-2">
          {{ globalError }}
        </div>
      </form>
    </template>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { usePlayer } from '~/composables/usePlayer'
import { useToast } from '~/composables/useToast'
import { useAnalytics } from '~/composables/useAnalytics'
import { isVideoArtwork, useArtwork } from '~/composables/useArtwork'
import MasterDrawer from './MasterDrawer.vue'
import CollectionSelect from './CollectionSelect.vue'
import Button from './Button.vue'
import { generateUniqueSlug } from '~/utils/collections'
import { findOrCreateTrackGroup } from '~/utils/trackGroups'
import { sanitizeStorageFilename } from '~/utils/sanitizeStorageFilename'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['update:show', 'music-uploaded'])

interface FileMetadata {
  title: string
  artist: string
  version: string
  group_name: string
  collection_name: string
  genre: string
  mood: string
  bpm: number | null
  key: string | null
  year: number | null
}

interface SelectedFile {
  file: File
  metadata: FileMetadata
  selectedCollectionIds: number[]
  duration: number | null
  progress: number
  error: string | null
  uploadedSoundId: number | null
  artworkFile: File | null
  artworkPreview: string | null
  artworkError: string | null
  artworkIsVideo: boolean
}

interface Collection {
  id: number
  name: string
  slug: string
}

const inputClass =
  'w-full p-2 text-xs font-semibold border border-[#3b3b3b] rounded-sm bg-transparent text-[#ccc] placeholder:text-[#545454] hover:border-neutral-600 disabled:opacity-50'

const route = useRoute()
const { supabase } = useSupabase()
const { user } = useAuth()
const { capture } = useAnalytics()
const { validateAndProcessArtwork, uploadArtwork, deleteArtwork } = useArtwork()
const { addTrackToQueue, queueSourceId } = usePlayer()
const { showError, showSuccess } = useToast()

const isDragging = ref(false)
const selectedFiles = ref<SelectedFile[]>([])
const isUploading = ref(false)
const userDisplayName = ref<string>('')
const showSuccessMessage = ref(false)
const uploadedCount = ref(0)
const collections = ref<Collection[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const reuploadInputs = ref<Record<number, HTMLInputElement | null>>({})
const artworkInputs = ref<Record<number, HTMLInputElement | null>>({})
const globalError = ref<string | null>(null)
const pendingCollections = ref<Map<number, Array<{ tempId: number, name: string }>>>(new Map())
const currentCollectionId = ref<number | null>(null)

const errors = ref({
  files: ''
})

const uploadButtonText = computed(() => {
  if (isUploading.value) {
    const completed = selectedFiles.value.filter(f => f.progress === 100).length
    return `Uploading... (${completed}/${selectedFiles.value.length})`
  }
  return `Upload ${selectedFiles.value.length} Track${selectedFiles.value.length !== 1 ? 's' : ''}`
})

const setReuploadInput = (index: number, el: HTMLInputElement | null) => {
  reuploadInputs.value[index] = el
}

const triggerReupload = (index: number) => {
  reuploadInputs.value[index]?.click()
}

const setArtworkInput = (index: number, el: HTMLInputElement | null) => {
  artworkInputs.value[index] = el
}

const triggerArtworkSelect = (index: number) => {
  artworkInputs.value[index]?.click()
}

const handleArtworkSelect = async (event: Event, index: number) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const fileData = selectedFiles.value[index]
  if (!fileData) return

  try {
    const { file: processedFile, preview } = await validateAndProcessArtwork(file)
    fileData.artworkFile = processedFile
    fileData.artworkPreview = preview
    fileData.artworkError = null
    fileData.artworkIsVideo = isVideoArtwork(processedFile.name)
  } catch (error: any) {
    fileData.artworkError = error.message || 'Invalid artwork file'
  }

  if (target) target.value = ''
}

const removeArtwork = (index: number) => {
  const fileData = selectedFiles.value[index]
  if (!fileData) return

  fileData.artworkFile = null
  fileData.artworkPreview = null
  fileData.artworkError = null
  fileData.artworkIsVideo = false
}

const queueCollectionCreation = (name: string, fileIndex: number) => {
  if (!name.trim()) return
  
  const tempId = -Date.now() - Math.random() * 1000
  
  const tempCollection = {
    id: tempId,
    name: name.trim(),
    slug: name.trim().toLowerCase().replace(/\s+/g, '-')
  }
  
  collections.value.push(tempCollection)
  
  if (!selectedFiles.value[fileIndex].selectedCollectionIds.includes(tempId)) {
    selectedFiles.value[fileIndex].selectedCollectionIds.push(tempId)
  }
  
  const existing = pendingCollections.value.get(fileIndex) || []
  existing.push({ tempId, name: name.trim() })
  pendingCollections.value.set(fileIndex, existing)
}

const fetchCurrentCollection = async () => {
  if (!supabase || !user.value) {
    currentCollectionId.value = null
    return
  }
  
  const path = route?.path || ''
  if (!path.includes('/c/')) {
    currentCollectionId.value = null
    return
  }
  
  try {
    const username = route.params.username as string
    const collectionSlug = route.params.collection as string
    
    if (!username || !collectionSlug) {
      currentCollectionId.value = null
      return
    }
    
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    
    if (!profileData) {
      currentCollectionId.value = null
      return
    }
    
    const { data: collectionData } = await supabase
      .from('collections')
      .select('id')
      .eq('slug', collectionSlug)
      .eq('user_id', profileData.id)
      .maybeSingle()
    
    if (collectionData) {
      currentCollectionId.value = collectionData.id
      
      const existsInList = collections.value.some(c => c.id === collectionData.id)
      if (!existsInList) {
        const { data: fullCollection } = await supabase
          .from('collections')
          .select('id, name, slug')
          .eq('id', collectionData.id)
          .single()
        
        if (fullCollection) {
          collections.value.push(fullCollection)
        }
      }
    } else {
      currentCollectionId.value = null
    }
  } catch (error) {
    console.error('Error fetching current collection:', error)
    currentCollectionId.value = null
  }
}

onMounted(async () => {
  if (!supabase || !user.value) return
  
  try {
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (profileData?.display_name) {
      userDisplayName.value = profileData.display_name
    }
    
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, slug')
      .eq('user_id', user.value.id)
      .order('name')
    
    if (error) throw error
    collections.value = data || []
    
    await fetchCurrentCollection()
  } catch (error) {
    console.error('Error fetching data:', error)
    collections.value = []
  }
})

watch(() => props.show, async (newVal) => {
  if (newVal) {
    await fetchCurrentCollection()
  }
})

const getNextVersionFromExisting = (currentVersion: string | null | undefined): string => {
  if (!currentVersion) return 'v1.0'

  const versionNum = parseFloat(currentVersion.replace(/^v/i, ''))
  if (!isNaN(versionNum)) {
    return `v${Math.floor(versionNum) + 1}.0`
  }

  return 'v1.0'
}

const findSimilarTrackMetadata = async (title: string, duration: number | null) => {
  if (!supabase || !user.value) return null
  
  try {
    const { normalizeTitle, similarityRatio } = await import('~/utils/trackGroups')
    const normalized = normalizeTitle(title)
    
    const { data: userTracks } = await supabase
      .from('sounds')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
    
    if (!userTracks || userTracks.length === 0) return null
    
    const exactMatch = userTracks.find(track => 
      track.title && track.title.toLowerCase() === title.toLowerCase()
    )
    
    if (exactMatch) {
      const isDurationSimilar = duration && exactMatch.duration && 
        Math.abs(duration - exactMatch.duration) < 2
      
      if (isDurationSimilar) {
        return {
          isDuplicate: true,
          duplicateTrack: exactMatch,
          artist: exactMatch.artist || '',
          genre: exactMatch.genre || '',
          mood: Array.isArray(exactMatch.mood) ? exactMatch.mood.join(', ') : (exactMatch.mood || ''),
          bpm: exactMatch.bpm || null,
          key: exactMatch.key || null,
          year: exactMatch.year || null,
          version: getNextVersionFromExisting(exactMatch.version),
          collectionIds: []
        }
      }
    }
    
    let bestMatch: any = null
    let bestRatio = 0
    
    for (const track of userTracks) {
      if (!track.title) continue
      
      const trackNormalized = normalizeTitle(track.title)
      const ratio = similarityRatio(normalized, trackNormalized)
      
      if (ratio >= 0.85 && ratio > bestRatio) {
        bestMatch = track
        bestRatio = ratio
      }
    }
    
    if (!bestMatch) return null
    
    const { data: junctionData } = await supabase
      .from('collections_sounds')
      .select('collection_id')
      .eq('sound_id', bestMatch.id)
    
    const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
    
    const moodString = Array.isArray(bestMatch.mood) 
      ? bestMatch.mood.join(', ') 
      : (bestMatch.mood || '')
    
    return {
      isDuplicate: false,
      artist: bestMatch.artist || '',
      genre: bestMatch.genre || '',
      mood: moodString,
      bpm: bestMatch.bpm || null,
      key: bestMatch.key || null,
      year: bestMatch.year || null,
      version: getNextVersionFromExisting(bestMatch.version),
      collectionIds
    }
  } catch (error) {
    console.error('Error finding similar track:', error)
    return null
  }
}

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
  const isMp3 = file.type.match(/audio\/(mpeg|mp3)/) || file.name.toLowerCase().endsWith('.mp3')
  const isM4a = file.type.match(/audio\/(mp4|x-m4a)/) || file.name.toLowerCase().endsWith('.m4a')
  if (!isMp3 && !isM4a) {
    return 'Only MP3 and M4A files are allowed'
  }
  
  if (file.size > 50 * 1024 * 1024) {
    return 'File size must be less than 50MB'
  }
  
  return null
}

const handleDrop = async (event: DragEvent) => {
  event.stopPropagation()
  isDragging.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length === 0) return
  await processFiles(files)
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  await processFiles(files)
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
    
    const audio = new Audio(URL.createObjectURL(file))
    const duration = await getDuration(audio)
    URL.revokeObjectURL(audio.src)
    
    const { parseFileName } = await import('~/utils/parseFileName')
    const parsedData = parseFileName(file.name)
    
    const { extractMP3Metadata } = await import('~/utils/mp3Metadata')
    const mp3Meta = await extractMP3Metadata(file)
    
    const prefillData = await findSimilarTrackMetadata(parsedData.title, duration)
    
    let warningMessage = null
    if (prefillData?.isDuplicate) {
      warningMessage = `⚠️ Possible duplicate of existing track "${prefillData.duplicateTrack.title}"`
    }
    
    const autoGroupName = await findOrCreateTrackGroup(
      supabase!,
      user.value!.id,
      parsedData.title
    )
    
    selectedFiles.value.push({
      file,
      metadata: {
        title: parsedData.title,
        artist: prefillData?.artist || mp3Meta?.artist || parsedData.artist || userDisplayName.value || '',
        version: parsedData.version || prefillData?.version || 'v1.0',
        group_name: autoGroupName,
        collection_name: '',
        genre: prefillData?.genre || mp3Meta?.genre || '',
        mood: prefillData?.mood || '',
        bpm: prefillData?.bpm || parsedData.bpm || null,
        key: prefillData?.key || parsedData.key || null,
        year: prefillData?.year || mp3Meta?.year || null
      },
      selectedCollectionIds: (() => {
        const ids = prefillData?.collectionIds || []
        if (currentCollectionId.value && !ids.includes(currentCollectionId.value)) {
          ids.push(currentCollectionId.value)
        }
        return ids
      })(),
      duration,
      progress: 0,
      error: warningMessage,
      uploadedSoundId: null,
      artworkFile: null,
      artworkPreview: null,
      artworkError: null,
      artworkIsVideo: false
    })
  }
}

const handleReupload = async (event: Event, index: number) => {
  const target = event.target as HTMLInputElement
  const newFile = target.files?.[0]
  if (!newFile) return

  const error = validateFile(newFile)
  if (error) {
    selectedFiles.value[index].error = error
    target.value = ''
    return
  }

  const fileData = selectedFiles.value[index]
  fileData.file = newFile
  fileData.progress = 0
  fileData.error = null

  const audio = new Audio(URL.createObjectURL(newFile))
  fileData.duration = await getDuration(audio)
  URL.revokeObjectURL(audio.src)

  const { parseFileName } = await import('~/utils/parseFileName')
  const parsed = parseFileName(newFile.name)

  if (!fileData.metadata.bpm && parsed.bpm) {
    fileData.metadata.bpm = parsed.bpm
  }
  if (!fileData.metadata.key && parsed.key) {
    fileData.metadata.key = parsed.key
  }
  if (parsed.version) {
    fileData.metadata.version = parsed.version
  }

  target.value = ''
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

const autoHideOlderVersions = async (
  newSoundId: number,
  trackGroupName: string,
  collectionIds: number[]
) => {
  if (!supabase || !user.value || !trackGroupName) return
  
  try {
    const { data: groupTracks } = await supabase
      .from('sounds')
      .select('id, version')
      .eq('user_id', user.value.id)
      .eq('track_group_name', trackGroupName)
      .neq('id', newSoundId)
    
    if (!groupTracks || groupTracks.length === 0) return
    
    for (const collectionId of collectionIds) {
      const { data: tracksInCollection } = await supabase
        .from('collections_sounds')
        .select('sound_id')
        .eq('collection_id', collectionId)
        .in('sound_id', groupTracks.map(t => t.id))
      
      if (!tracksInCollection || tracksInCollection.length === 0) continue
      
      const soundIdsToHide = tracksInCollection.map(t => t.sound_id)
      
      if (soundIdsToHide.length > 0) {
        await supabase
          .from('collections_sounds')
          .update({ hidden: true })
          .eq('collection_id', collectionId)
          .in('sound_id', soundIdsToHide)
      }
    }
  } catch (error) {
    console.error('Error auto-hiding older versions:', error)
  }
}

const uploadFile = async (fileData: SelectedFile): Promise<boolean> => {
  if (!supabase || !user.value) {
    fileData.error = 'Not authenticated'
    return false
  }

  let artworkPath: string | null = null
  
  try {
    if (fileData.artworkFile) {
      fileData.progress = 5
      artworkPath = await uploadArtwork(fileData.artworkFile, user.value.id)
    }

    fileData.progress = 10
    
    const timestamp = Date.now()
    const safeName = sanitizeStorageFilename(fileData.file.name)
    const filePath = `${user.value.id}/${timestamp}-${safeName}`
    
    fileData.progress = 30
    const { error: uploadError } = await supabase.storage
      .from('sounds')
      .upload(filePath, fileData.file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) throw uploadError
    
    fileData.progress = 60
    
    const moodArray = fileData.metadata.mood 
      ? fileData.metadata.mood.split(',').map(m => m.trim()).filter(m => m)
      : null
    
    const trackGroupName = fileData.metadata.group_name?.trim()
      ? fileData.metadata.group_name.trim()
      : await findOrCreateTrackGroup(
          supabase,
          user.value.id,
          fileData.metadata.title || fileData.file.name
        )
    
    const { data: soundData, error: dbError } = await supabase
      .from('sounds')
      .insert({
        user_id: user.value.id,
        storage_path: filePath,
        artwork_path: artworkPath,
        title: fileData.metadata.title || null,
        artist: fileData.metadata.artist || null,
        version: fileData.metadata.version || 'v1.0',
        track_group_name: trackGroupName,
        file_size: fileData.file.size,
        duration: fileData.duration,
        genre: fileData.metadata.genre || null,
        mood: moodArray,
        bpm: fileData.metadata.bpm,
        key: fileData.metadata.key,
        year: fileData.metadata.year
      })
      .select('id')
      .single()
    
    if (dbError) throw dbError
    
    fileData.uploadedSoundId = soundData.id
    
    let collectionNames = ''
    if (fileData.selectedCollectionIds && fileData.selectedCollectionIds.length > 0) {
      const collectionsToInsert = fileData.selectedCollectionIds.map(collectionId => ({
        collection_id: collectionId,
        sound_id: soundData.id,
        hidden: false
      }))
      
      const { error: junctionError } = await supabase
        .from('collections_sounds')
        .insert(collectionsToInsert)
      
      if (junctionError) {
        console.error('Error adding to collections:', junctionError)
      } else {
        await autoHideOlderVersions(soundData.id, trackGroupName, fileData.selectedCollectionIds)
        
        const collectionNamesData = collections.value
          .filter(c => fileData.selectedCollectionIds.includes(c.id))
          .map(c => c.name)
          .join(', ')
        collectionNames = collectionNamesData
      }
    }
    
    if (queueSourceId.value === `profile-${user.value.id}`) {
      const newTrack = {
        id: soundData.id,
        user_id: user.value.id,
        title: fileData.metadata.title || 'Untitled',
        artist: fileData.metadata.artist || 'Unknown',
        storage_path: filePath,
        artwork_path: artworkPath,
        duration: fileData.duration || 0,
        version: fileData.metadata.version || 'v1.0',
        genre: fileData.metadata.genre || null,
        bpm: fileData.metadata.bpm,
        collection_names: collectionNames || '-'
      }
      addTrackToQueue(newTrack)
    }
    
    fileData.progress = 100
    return true
    
  } catch (error: any) {
    console.error('Upload error:', error)
    if (artworkPath) {
      await deleteArtwork(artworkPath)
    }
    fileData.error = error.message || 'Upload failed'
    showError(`Failed to upload "${fileData.metadata.title}": ${error.message || 'Unknown error'}`)
    return false
  }
}

const onSubmit = async () => {
  if (selectedFiles.value.length === 0 || !user.value) return
  
  isUploading.value = true
  globalError.value = null
  let successCount = 0
  
  try {
    for (const [fileIndex, pendingCollectionInfos] of pendingCollections.value) {
      for (const { tempId, name } of pendingCollectionInfos) {
        const { data: existing } = await supabase
          .from('collections')
          .select('slug')
          .eq('user_id', user.value.id)
        
        const existingSlugs = (existing || []).map(c => c.slug)
        const slug = generateUniqueSlug(name, existingSlugs)
        
        const { data, error: createError } = await supabase
          .from('collections')
          .insert({
            user_id: user.value.id,
            name: name,
            description: null,
            slug
          })
          .select()
          .single()
        
        if (createError) throw createError
        
        const tempCollectionIndex = collections.value.findIndex(c => c.id === tempId)
        if (tempCollectionIndex !== -1) {
          collections.value[tempCollectionIndex] = {
            id: data.id,
            name: data.name,
            slug: data.slug
          }
        }
        
        const selectedIndex = selectedFiles.value[fileIndex].selectedCollectionIds.indexOf(tempId)
        if (selectedIndex !== -1) {
          selectedFiles.value[fileIndex].selectedCollectionIds[selectedIndex] = data.id
        }
      }
    }
    
    pendingCollections.value.clear()
    
    for (const fileData of selectedFiles.value) {
      const success = await uploadFile(fileData)
      if (success) successCount++
    }
    
    if (successCount > 0) {
      uploadedCount.value = successCount
      showSuccessMessage.value = true
      emit('music-uploaded')

      const isBulk = successCount > 1
      for (const fileData of selectedFiles.value) {
        if (!fileData.uploadedSoundId) continue
        const hasMetadata = Boolean(
          fileData.metadata.title || fileData.metadata.artist || fileData.metadata.genre
        )
        capture('track_uploaded', {
          track_id: fileData.uploadedSoundId,
          has_metadata: hasMetadata,
          bulk: isBulk,
        })
      }
      
      showSuccess(`Successfully uploaded ${successCount} track${successCount !== 1 ? 's' : ''}`)
    } else {
      globalError.value = 'All uploads failed. Please try again.'
      showError('All uploads failed. Please try again.')
    }
    
  } catch (error) {
    console.error('Error during upload:', error)
    globalError.value = 'An error occurred during upload'
    showError('An error occurred during upload')
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
