<template>
  <MasterDrawer :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Upload Music</h2>
    </template>

    <!-- Success Message -->
    <div v-if="showSuccessMessage" class="h-full flex flex-col items-center justify-center text-center gap-4">
      <h2 class="text-xl">Upload successful!</h2>
      <p class="text-neutral-600">{{ uploadedCount }} track(s) uploaded to your library.</p>
      <button @click="resetAndShowForm" class="text-amber-300 hover:text-amber-400 underline mt-4 cursor-pointer">
        Upload more tracks
      </button>
    </div>

    <!-- Upload Form -->
    <template v-else>
        <form class="grow flex flex-col gap-8 justify-between" @submit.prevent="onSubmit">
        <!-- Drag & Drop Zone -->
        <fieldset class="flex flex-col gap-2">
          <div @drop.prevent="handleDrop" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false"
            :class="[
              'border-2 border-dashed rounded-lg p-2 text-center transition-colors min-h-[100px] flex items-center justify-center',
              isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-700 hover:border-neutral-600'
            ]">
            <input ref="fileInput" type="file" accept="audio/mpeg,audio/mp3,.mp3" multiple class="hidden"
              @change="handleFileSelect" />
            <div class="flex flex-row justify-between items-center gap-4 w-full">

              <div class="grow flex flex-col gap-1">
                <p class="text-base font-medium">{{ isDragging ? 'Drop files here' : 'Drag & drop MP3 files here' }}</p>
                <p class="text-sm text-neutral-500">or <button type="button" @click="$refs.fileInput.click()"
                    class="text-amber-400 hover:text-amber-300 cursor-pointer">click to browse</button></p>
                <p class="text-xs text-neutral-600">Maximum 50MB per file</p>
              </div>
            </div>
          </div>
          <span v-if="errors.files" class="text-red-500 text-sm">{{ errors.files }}</span>
        </fieldset>

        <!-- Selected Files List -->
        <div v-if="selectedFiles.length > 0" class="flex flex-col gap-4 h-full">
          <h3 class="font-semibold">Selected Files ({{ selectedFiles.length }})</h3>
          <div class="flex flex-col gap-4">
            <div v-for="(file, index) in selectedFiles" :key="index" class="border border-neutral-800 bg-neutral-800 rounded-lg *:p-4">
              <div class="flex items-center justify-between bg-neutral-900/30">
                <span class="font-medium text-sm truncate flex-1">{{ file.file.name }}</span>
                <button type="button" @click="removeFile(index)" class="cursor-pointer text-red-500 hover:text-red-400 ml-2"
                  :disabled="isUploading">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Upload Progress -->
              <div v-if="file.progress > 0 && file.progress < 100" class="w-full bg-neutral-700 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full transition-all" :style="{ width: `${file.progress}%` }"></div>
              </div>

              <!-- Metadata Fields -->
              <div class="flex flex-col gap-3">
                <!-- Title (full width) -->
                <div>
                  <label class="text-xs text-neutral-400">Title <span class="text-red-500">*</span></label>
                  <input v-model="file.metadata.title" type="text" required
                    class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                    :disabled="isUploading" />
                </div>

                <!-- Group Name (full width) -->
                <div>
                  <label class="text-xs text-neutral-400">
                    Group Name
                    <span class="text-neutral-500 ml-1">(for grouping versions)</span>
                  </label>
                  <input v-model="file.metadata.group_name" type="text" placeholder="Auto-generated if empty"
                    class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                    :disabled="isUploading" />
                  <p class="text-xs text-neutral-500 mt-1">Used to group different versions of the same track</p>
                </div>

                <!-- Other fields in grid -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-neutral-400">Artist</label>
                    <input v-model="file.metadata.artist" type="text"
                      class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                      :disabled="isUploading" />
                  </div>
                  <div>
                    <label class="text-xs text-neutral-400">Version</label>
                    <input v-model="file.metadata.version" type="text" placeholder="e.g. v1.0, v2.5"
                      class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                      :disabled="isUploading" />
                  </div>
                  <div class="col-span-2">
                    <label class="text-xs text-neutral-400">Collections (optional)</label>
                    <CollectionSelect v-model="file.selectedCollectionIds" :collections="collections" size="sm"
                      :disabled="isUploading" @create-collection="(name) => queueCollectionCreation(name, index)" />
                  </div>
                  <div>
                    <label class="text-xs text-neutral-400">Genre</label>
                    <input v-model="file.metadata.genre" type="text"
                      class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                      :disabled="isUploading" />
                  </div>
                  <div>
                    <label class="text-xs text-neutral-400">BPM</label>
                    <input v-model.number="file.metadata.bpm" type="number"
                      class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                      :disabled="isUploading" />
                  </div>
                  <div>
                    <label class="text-xs text-neutral-400">Year</label>
                    <input v-model.number="file.metadata.year" type="number"
                      class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                      :disabled="isUploading" />
                  </div>
                  <div>
                    <label class="text-xs text-neutral-400">Mood</label>
                    <input v-model="file.metadata.mood" type="text" placeholder="e.g. Dark, Happy"
                      class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                      :disabled="isUploading" />
                  </div>
                </div>
              </div>

              <!-- File Info -->
              <div class="mt-2 text-xs text-neutral-500 flex items-center gap-4">
                <span>{{ formatFileSize(file.file.size) }}</span>
                <span v-if="file.duration">{{ formatDuration(file.duration) }}</span>
              </div>

              <!-- Error/Warning Message -->
              <div v-if="file.error" :class="[
                'mt-2 text-xs',
                file.error.startsWith('⚠️') ? 'text-amber-500' : 'text-red-500'
              ]">
                {{ file.error }}
              </div>
            </div>
          </div>
        </div>

        <!-- Upload Button -->
        <div class="sticky bottom-0 flex justify-end bg-neutral-900">
          <button 
            type="submit" 
            :class="[
              'btn w-full',
              selectedFiles.length === 0 
                ? 'bg-neutral-500 text-neutral-700 cursor-not-allowed' 
                : 'bg-amber-300 hover:bg-amber-400 text-neutral-900'
            ]"
            :disabled="isUploading || selectedFiles.length === 0">
            {{ uploadButtonText }}
          </button>
        </div>

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
import { usePlayer } from '~/composables/usePlayer'
import MasterDrawer from './MasterDrawer.vue'
import CollectionSelect from './CollectionSelect.vue'
import { generateSlug, generateUniqueSlug } from '~/utils/collections'
import { findOrCreateTrackGroup } from '~/utils/trackGroups'

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
const { addTrackToQueue, queueSourceId } = usePlayer()

const isDragging = ref(false)
const selectedFiles = ref<SelectedFile[]>([])
const isUploading = ref(false)
const userDisplayName = ref<string>('')
const showSuccessMessage = ref(false)
const uploadedCount = ref(0)
const collections = ref<Collection[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const globalError = ref<string | null>(null)
const pendingCollections = ref<Map<number, Array<{ tempId: number, name: string }>>>(new Map())

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

const queueCollectionCreation = (name: string, fileIndex: number) => {
  if (!name.trim()) return
  
  // Create a temporary collection ID (negative numbers to avoid conflicts)
  const tempId = -Date.now() - Math.random() * 1000
  
  // Create a temporary collection object
  const tempCollection = {
    id: tempId,
    name: name.trim(),
    slug: name.trim().toLowerCase().replace(/\s+/g, '-')
  }
  
  // Add to collections list so it shows up in the UI
  collections.value.push(tempCollection)
  
  // Add to selected collections for this file
  if (!selectedFiles.value[fileIndex].selectedCollectionIds.includes(tempId)) {
    selectedFiles.value[fileIndex].selectedCollectionIds.push(tempId)
    console.log(`Added temp collection ${tempId} (${name}) to file ${fileIndex}`)
  }
  
  // Store the temp collection info for later replacement during upload
  const existing = pendingCollections.value.get(fileIndex) || []
  existing.push({ tempId, name: name.trim() })
  pendingCollections.value.set(fileIndex, existing)
}

// Fetch collections on mount
onMounted(async () => {
  if (!supabase || !user.value) return
  
  try {
    // Fetch user's display name for default artist
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.value.id)
      .single()
    
    if (profileData?.display_name) {
      userDisplayName.value = profileData.display_name
    }
    
    // Fetch collections
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, slug')
      .eq('user_id', user.value.id)
      .order('name')
    
    if (error) throw error
    collections.value = data || []
  } catch (error) {
    console.error('Error fetching data:', error)
    // Don't block upload if fetch fails
    collections.value = []
  }
})

const findSimilarTrackMetadata = async (title: string, duration: number | null) => {
  if (!supabase || !user.value) return null
  
  try {
    // Normalize the title (strip BPM/version)
    const { normalizeTitle, similarityRatio } = await import('~/utils/trackGroups')
    const normalized = normalizeTitle(title)
    
    // Get all user's tracks
    const { data: userTracks } = await supabase
      .from('sounds')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false }) // Most recent first
    
    if (!userTracks || userTracks.length === 0) return null
    
    // Check for exact duplicates first (same title)
    const exactMatch = userTracks.find(track => 
      track.title && track.title.toLowerCase() === title.toLowerCase()
    )
    
    if (exactMatch) {
      // Check if duration is also similar (within 2 seconds)
      const isDurationSimilar = duration && exactMatch.duration && 
        Math.abs(duration - exactMatch.duration) < 2
      
      if (isDurationSimilar) {
        console.warn(`⚠️  POTENTIAL DUPLICATE: "${title}"`)
        console.warn(`   Existing track: "${exactMatch.title}" (${exactMatch.duration}s)`)
        console.warn(`   New upload: "${title}" (${duration}s)`)
        
        return {
          isDuplicate: true,
          duplicateTrack: exactMatch,
          artist: exactMatch.artist || '',
          genre: exactMatch.genre || '',
          mood: Array.isArray(exactMatch.mood) ? exactMatch.mood.join(', ') : (exactMatch.mood || ''),
          bpm: exactMatch.bpm || null,
          year: exactMatch.year || null,
          version: exactMatch.version || 'v1.0',
          collectionIds: []
        }
      }
    }
    
    // Find similar tracks (85% similarity threshold)
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
    
    console.log(`📋 Found similar track: "${bestMatch.title}" (${Math.round(bestRatio * 100)}% match)`)
    console.log(`   Copying metadata: artist, genre, BPM, year, mood, collections`)
    
    // Get collections for this track
    const { data: junctionData } = await supabase
      .from('collections_sounds')
      .select('collection_id')
      .eq('sound_id', bestMatch.id)
    
    const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
    
    // Format mood (array to comma-separated string)
    const moodString = Array.isArray(bestMatch.mood) 
      ? bestMatch.mood.join(', ') 
      : (bestMatch.mood || '')
    
    // Suggest next version number
    let nextVersion = 'v1.0'
    if (bestMatch.version) {
      const versionNum = parseFloat(bestMatch.version.replace('v', ''))
      if (!isNaN(versionNum)) {
        nextVersion = `v${Math.floor(versionNum) + 1}.0`
      }
    }
    
    return {
      isDuplicate: false,
      artist: bestMatch.artist || '',
      genre: bestMatch.genre || '',
      mood: moodString,
      bpm: bestMatch.bpm || null,
      year: bestMatch.year || null,
      version: nextVersion,
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
    
    // Parse metadata from filename
    const { parseFileName } = await import('~/utils/parseFileName')
    const parsedData = parseFileName(file.name)
    
    console.log(`📝 Parsed filename "${file.name}":`, parsedData)
    
    // Extract MP3 metadata (ID3 tags)
    const { extractMP3Metadata } = await import('~/utils/mp3Metadata')
    const mp3Meta = await extractMP3Metadata(file)
    
    console.log(`🎵 Extracted MP3 metadata:`, mp3Meta)
    
    // Try to find similar track and copy metadata (includes duplicate detection)
    const prefillData = await findSimilarTrackMetadata(parsedData.title, duration)
    
    // If potential duplicate detected, add warning
    let warningMessage = null
    if (prefillData?.isDuplicate) {
      warningMessage = `⚠️ Possible duplicate of existing track "${prefillData.duplicateTrack.title}"`
    }
    
    // Auto-generate group name (user can edit it)
    const autoGroupName = await findOrCreateTrackGroup(
      supabase!,
      user.value!.id,
      parsedData.title
    )
    
    // Merge all metadata sources
    // Priority: Similar track > MP3 ID3 tags > Filename parsing > User's display name > Empty
    selectedFiles.value.push({
      file,
      metadata: {
        // Title: Always use cleaned filename (most descriptive)
        title: parsedData.title,
        
        // Artist: Similar track > MP3 tags > Filename > User's display name > Empty
        artist: prefillData?.artist || mp3Meta?.artist || parsedData.artist || userDisplayName.value || '',
        
        // Version: Similar track > Filename > Default
        version: prefillData?.version || parsedData.version || 'v1.0',
        
        // Group Name: Auto-generated (user can edit)
        group_name: autoGroupName,
        
        collection_name: '', // Keep for backwards compatibility but not used
        
        // Genre: Similar track > MP3 tags > Empty
        genre: prefillData?.genre || mp3Meta?.genre || '',
        
        // Mood: Similar track only
        mood: prefillData?.mood || '',
        
        // BPM: Similar track > Filename > Null
        bpm: prefillData?.bpm || parsedData.bpm || null,
        
        // Year: Similar track > MP3 tags > Null
        year: prefillData?.year || mp3Meta?.year || null
      },
      selectedCollectionIds: prefillData?.collectionIds || [],
      duration,
      progress: 0,
      error: warningMessage // Will show as warning in yellow
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

const autoHideOlderVersions = async (
  newSoundId: number,
  trackGroupName: string,
  collectionIds: number[]
) => {
  if (!supabase || !user.value || !trackGroupName) return
  
  try {
    // Find other tracks in the same group by this user
    const { data: groupTracks } = await supabase
      .from('sounds')
      .select('id, version')
      .eq('user_id', user.value.id)
      .eq('track_group_name', trackGroupName)
      .neq('id', newSoundId) // Exclude the newly uploaded track
    
    if (!groupTracks || groupTracks.length === 0) return
    
    // For each collection, hide older versions
    for (const collectionId of collectionIds) {
      // Get all tracks from this group that are in this collection
      const { data: tracksInCollection } = await supabase
        .from('collections_sounds')
        .select('sound_id')
        .eq('collection_id', collectionId)
        .in('sound_id', groupTracks.map(t => t.id))
      
      if (!tracksInCollection || tracksInCollection.length === 0) continue
      
      // Hide all older versions in this collection
      const soundIdsToHide = tracksInCollection.map(t => t.sound_id)
      
      if (soundIdsToHide.length > 0) {
        await supabase
          .from('collections_sounds')
          .update({ hidden: true })
          .eq('collection_id', collectionId)
          .in('sound_id', soundIdsToHide)
        
        console.log(`✓ Auto-hid ${soundIdsToHide.length} older version(s) in collection ${collectionId}`)
      }
    }
  } catch (error) {
    console.error('Error auto-hiding older versions:', error)
    // Don't throw - this is a nice-to-have feature
  }
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
    
    // Use user-provided group name, or auto-generate if empty
    const trackGroupName = fileData.metadata.group_name?.trim()
      ? fileData.metadata.group_name.trim()
      : await findOrCreateTrackGroup(
          supabase,
          user.value.id,
          fileData.metadata.title || fileData.file.name
        )
    
    // Save to sounds table and get the sound_id
    const { data: soundData, error: dbError } = await supabase
      .from('sounds')
      .insert({
        user_id: user.value.id,
        storage_path: filePath,
        title: fileData.metadata.title || null,
        artist: fileData.metadata.artist || null,
        version: fileData.metadata.version || 'v1.0',
        track_group_name: trackGroupName,
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
    let collectionNames = ''
    console.log('Processing collections for track:', fileData.metadata.title, 'selectedCollectionIds:', fileData.selectedCollectionIds)
    if (fileData.selectedCollectionIds && fileData.selectedCollectionIds.length > 0) {
      const collectionsToInsert = fileData.selectedCollectionIds.map(collectionId => ({
        collection_id: collectionId,
        sound_id: soundData.id,
        hidden: false // New track is visible by default
      }))
      
      const { error: junctionError } = await supabase
        .from('collections_sounds')
        .insert(collectionsToInsert)
      
      if (junctionError) {
        console.error('Error adding to collections:', junctionError)
        // Don't fail the upload if collection assignment fails
      } else {
        // Auto-hide older versions in these collections
        await autoHideOlderVersions(soundData.id, trackGroupName, fileData.selectedCollectionIds)
        
        // Get collection names for display
        const collectionNamesData = collections.value
          .filter(c => fileData.selectedCollectionIds.includes(c.id))
          .map(c => c.name)
          .join(', ')
        collectionNames = collectionNamesData
      }
    }
    
    // Add to player queue if current queue is from this user's profile
    if (queueSourceId.value === `profile-${user.value.id}`) {
      const newTrack = {
        id: soundData.id,
        user_id: user.value.id,
        title: fileData.metadata.title || 'Untitled',
        artist: fileData.metadata.artist || 'Unknown',
        storage_path: filePath,
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
    // Create pending collections first
    for (const [fileIndex, pendingCollectionInfos] of pendingCollections.value) {
      for (const { tempId, name } of pendingCollectionInfos) {
        // Get existing slugs to ensure uniqueness
        const { data: existing } = await supabase
          .from('collections')
          .select('slug')
          .eq('user_id', user.value.id)
        
        const existingSlugs = (existing || []).map(c => c.slug)
        const slug = generateUniqueSlug(name, existingSlugs)
        
        // Create the collection
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
        
        // Replace the temporary collection with the real one
        const tempCollectionIndex = collections.value.findIndex(c => c.id === tempId)
        if (tempCollectionIndex !== -1) {
          collections.value[tempCollectionIndex] = {
            id: data.id,
            name: data.name,
            slug: data.slug
          }
        }
        
        // Replace the temporary ID in selected collections
        const selectedIndex = selectedFiles.value[fileIndex].selectedCollectionIds.indexOf(tempId)
        if (selectedIndex !== -1) {
          selectedFiles.value[fileIndex].selectedCollectionIds[selectedIndex] = data.id
          console.log(`Replaced temp ID ${tempId} with real ID ${data.id} for file ${fileIndex}`)
        }
      }
    }
    
    // Clear pending collections
    pendingCollections.value.clear()
    
    // Upload files sequentially
    for (const fileData of selectedFiles.value) {
      console.log('Uploading file:', fileData.metadata.title, 'with collections:', fileData.selectedCollectionIds)
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

