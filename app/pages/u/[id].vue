<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <header class="px-2 pt-8 pb-4 border-b border-neutral-800">
      <h1 class="text-xl lg:text-3xl font-bold indent-1">{{ profileName }}</h1>
    </header>

    <!-- Drag & Drop Upload Zone (only for own profile) -->
    <div 
      v-if="isOwnProfile && user"
      class="px-2"
    >
      <div
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        :class="[
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-700 hover:border-neutral-600'
        ]"
      >
        <div class="flex flex-col items-center gap-4">
          <svg class="w-12 h-12 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <div>
            <p class="text-lg font-medium">{{ isDragging ? 'Drop files here' : 'Drag & drop MP3 files here' }}</p>
            <p class="text-sm text-neutral-500 mt-1">Maximum file size: 50MB per file</p>
          </div>
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-if="uploading.length > 0" class="mt-4 space-y-2">
        <div 
          v-for="upload in uploading" 
          :key="upload.filename"
          class="flex items-center gap-3 p-3 bg-neutral-800 rounded"
        >
          <div class="flex-1">
            <p class="text-sm font-medium">{{ upload.filename }}</p>
            <div class="w-full bg-neutral-700 rounded-full h-2 mt-2">
              <div 
                class="bg-blue-500 h-2 rounded-full transition-all"
                :style="{ width: `${upload.progress}%` }"
              ></div>
            </div>
          </div>
          <span class="text-xs text-neutral-500">{{ upload.progress }}%</span>
        </div>
      </div>

      <!-- Upload Errors -->
      <div v-if="errors.length > 0" class="mt-4 space-y-2">
        <div 
          v-for="(error, idx) in errors" 
          :key="idx"
          class="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>
    </div>

    <!-- Track List -->
    <div class="px-2">
      <h2 class="text-lg font-semibold mb-4">Tracks</h2>
      
      <div v-if="loading" class="text-neutral-500">Loading tracks...</div>
      
      <div v-else-if="tracks.length === 0" class="text-neutral-500">
        {{ isOwnProfile ? 'No tracks uploaded yet. Drag and drop MP3 files above to get started.' : 'No tracks available.' }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-neutral-800">
            <tr class="text-left text-neutral-500">
              <th class="pb-2 pr-4">Title</th>
              <th class="pb-2 pr-4">Artist</th>
              <th class="pb-2 pr-4">Collection</th>
              <th class="pb-2 pr-4">Genre</th>
              <th class="pb-2 pr-4">BPM</th>
              <th class="pb-2 pr-4">Duration</th>
              <th v-if="isOwnProfile" class="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="track in tracks" 
              :key="track.id"
              class="border-b border-neutral-800/50 hover:bg-neutral-800/30"
            >
              <td class="py-3 pr-4">{{ track.storage_path?.split('/').pop()?.replace(/^\d+-/, '') || 'Untitled' }}</td>
              <td class="py-3 pr-4 text-neutral-400">{{ track.artist || 'Unknown' }}</td>
              <td class="py-3 pr-4 text-neutral-400">{{ track.collection_id || '-' }}</td>
              <td class="py-3 pr-4 text-neutral-400">{{ track.genre || '-' }}</td>
              <td class="py-3 pr-4 text-neutral-400">{{ track.bpm || '-' }}</td>
              <td class="py-3 pr-4 text-neutral-400">{{ formatDuration(track.duration) }}</td>
              <td v-if="isOwnProfile" class="py-3">
                <button
                  @click="deleteTrack(track.id, track.storage_path)"
                  class="text-red-500 hover:text-red-400 text-xs"
                  title="Delete track"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'

const route = useRoute()
const { user, isReady } = useAuth()
const { supabase } = useSupabase()

// State
const profileName = ref('')
const profileUserId = ref<string | null>(null)
const tracks = ref<any[]>([])
const loading = ref(true)
const isDragging = ref(false)
const uploading = ref<Array<{ filename: string; progress: number }>>([])
const errors = ref<string[]>([])

// Computed
const isOwnProfile = computed(() => {
  return user.value && profileUserId.value && user.value.id === profileUserId.value
})

// Methods
const fetchProfile = async () => {
  const usernameOrId = route.params.id as string
  
  if (!supabase) return
  
  try {
    // Try to fetch profile by username
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name')
      .eq('username', usernameOrId)
      .single()

    if (error || !data) {
      // Fallback: try as UUID if username lookup fails
      profileUserId.value = usernameOrId
      profileName.value = usernameOrId
    } else {
      profileUserId.value = data.id as string
      profileName.value = (data.display_name || data.username || usernameOrId) as string
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    // Fallback
    profileUserId.value = usernameOrId
    profileName.value = usernameOrId
  }
}

const fetchTracks = async () => {
  if (!supabase || !profileUserId.value) return
  
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('sounds')
      .select('*')
      .eq('user_id', profileUserId.value)
      .order('created_at', { ascending: false })

    if (error) throw error
    tracks.value = data || []
  } catch (error) {
    console.error('Error fetching tracks:', error)
    errors.value.push('Failed to load tracks')
  } finally {
    loading.value = false
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

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false
  errors.value = []

  const files = Array.from(event.dataTransfer?.files || [])
  const mp3Files = files.filter(file => 
    file.type === 'audio/mpeg' || 
    file.type === 'audio/mp3' ||
    file.name.toLowerCase().endsWith('.mp3')
  )

  if (mp3Files.length === 0) {
    errors.value.push('No valid MP3 files found')
    return
  }

  if (!supabase || !user.value) {
    errors.value.push('You must be logged in to upload files')
    return
  }

  for (const file of mp3Files) {
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      errors.value.push(`${file.name}: File too large (max 50MB)`)
      continue
    }

    const uploadItem = { filename: file.name, progress: 0 }
    uploading.value.push(uploadItem)

    try {
      // Generate file path
      const timestamp = Date.now()
      const filePath = `${user.value.id}/${timestamp}-${file.name}`

      // Upload to storage
      uploadItem.progress = 25
      const { error: uploadError } = await supabase.storage
        .from('sounds')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      uploadItem.progress = 50

      // Extract metadata
      const audio = new Audio(URL.createObjectURL(file))
      const duration = await getDuration(audio)
      URL.revokeObjectURL(audio.src)

      uploadItem.progress = 75

      // Save to database
      const { error: dbError } = await supabase
        .from('sounds')
        .insert({
          user_id: user.value.id,
          storage_path: filePath,
          file_size: file.size,
          duration: duration
        })

      if (dbError) throw dbError

      uploadItem.progress = 100

      // Remove from uploading list after a brief delay
      setTimeout(() => {
        uploading.value = uploading.value.filter(u => u !== uploadItem)
      }, 1000)

      // Refresh tracks list
      await fetchTracks()
    } catch (error: any) {
      console.error('Upload error:', error)
      errors.value.push(`${file.name}: ${error.message}`)
      uploading.value = uploading.value.filter(u => u !== uploadItem)
    }
  }
}

const deleteTrack = async (trackId: number, storagePath: string) => {
  if (!supabase || !confirm('Are you sure you want to delete this track?')) return

  try {
    // Delete from storage
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('sounds')
        .remove([storagePath])

      if (storageError) throw storageError
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('sounds')
      .delete()
      .eq('id', trackId)

    if (dbError) throw dbError

    // Refresh tracks list
    await fetchTracks()
  } catch (error: any) {
    console.error('Delete error:', error)
    errors.value.push(`Failed to delete track: ${error.message}`)
  }
}

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds === 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Lifecycle
onMounted(async () => {
  await fetchProfile()
  await fetchTracks()
})
</script>

