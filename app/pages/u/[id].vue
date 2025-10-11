<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <!-- Track List -->
    <div class="py-2">
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
  if (!supabase || !profileUserId.value) {
    console.log('fetchTracks: Missing supabase or profileUserId', { supabase: !!supabase, profileUserId: profileUserId.value })
    return
  }
  
  loading.value = true
  console.log('fetchTracks: Querying sounds for user:', profileUserId.value)
  
  try {
    const { data, error } = await supabase
      .from('sounds')
      .select('*')
      .eq('user_id', profileUserId.value)
      .order('created_at', { ascending: false })

    console.log('fetchTracks: Query result', { data, error, count: data?.length })
    
    if (error) throw error
    tracks.value = data || []
  } catch (error) {
    console.error('Error fetching tracks:', error)
    alert('Failed to load tracks: ' + (error as any).message)
  } finally {
    loading.value = false
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
    alert(`Failed to delete track: ${error.message}`)
  }
}

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds === 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Expose fetchTracks for parent to call
defineExpose({
  fetchTracks
})

// Lifecycle
onMounted(async () => {
  await fetchProfile()
  await fetchTracks()
})
</script>

