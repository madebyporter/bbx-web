<template>
  <div class="overflow-x-auto lg:overflow-x-visible w-full h-full">
    <div v-if="loading" class="flex items-center justify-center p-8 h-full w-full grow">
      <LoadingLogo />
    </div>

    <!-- Zero State -->
    <div v-else-if="tracks.length === 0" class="py-16 w-full text-center">
      <div class="max-w-md mx-auto">
        <h3 class="text-lg font-medium mb-2 text-neutral-300">
          {{ isOwnProfile ? 'No tracks uploaded yet' : 'No tracks available' }}
        </h3>
        <p class="text-neutral-500 text-sm mb-6">
          {{ isOwnProfile
          ? 'Start building your music library by uploading your first track.'
          : 'This user hasn\'t uploaded any tracks yet.'
          }}
        </p>
        <button v-if="isOwnProfile" @click="handleUploadClick"
          class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-900 font-medium rounded transition-colors cursor-pointer">
          Upload Music
        </button>
      </div>
    </div>

    <div v-else class="w-fit lg:w-full">
      <!-- Bulk Actions Drawer -->
      <BulkActionsDrawer
        v-model:show="showBulkActionsDrawer"
        :selected-tracks="selectedTracksArray"
        :selected-count="selectedTrackIds.size"
        @tracks-deleted="handleTracksDeleted"
        @tracks-updated="handleTracksUpdated"
        @close="handleBulkActionsClose"
      />
      
      <!-- Header -->
      <div :class="[
          'text-sm text-left text-neutral-500 border-b border-neutral-800 py-2 lg:sticky lg:top-20 bg-neutral-900 z-40',
          isOwnProfile ? 'trackGrid-edit' : 'trackGrid'
        ]">
        <div class="flex items-center justify-center">
          <button
            v-if="isOwnProfile"
            @click="handleHeaderCheckboxClick"
            class="text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            :title="bulkSelectionMode ? (clickCount === 2 ? 'Deselect all' : 'Select all') : 'Select tracks'"
          >
            <svg v-if="bulkSelectionMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect v-if="clickCount !== 2" x="4" y="4" width="16" height="16" rx="2" stroke-width="2" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke-width="2" />
            </svg>
          </button>
        </div>
        <div>Title</div>
        <div>Artist</div>
        <div>Version</div>
        <div>Collection</div>
        <div>Genre</div>
        <div>BPM</div>
        <div>Duration</div>
        <div v-if="isOwnProfile">Status</div>
        <div v-if="isOwnProfile" class="flex items-center justify-start">
          <button
            v-if="hasSelections"
            @click="showBulkActionsDrawer = true"
            class="px-2 py-0.5 bg-amber-400 hover:bg-amber-500 text-neutral-900 text-xs font-medium rounded transition-colors cursor-pointer"
          >
            Bulk ({{ selectedTrackIds.size }})
          </button>
        </div>
      </div>

      <!-- Tracks -->
      <div v-for="(track, index) in tracks" :key="track.id" :data-track-id="track.id" :class="[
          'text-sm border-b border-neutral-800/50 py-3 transition-colors items-center',
          isOwnProfile ? 'trackGrid-edit' : 'trackGrid', isCurrentlyPlaying(track) ? 'bg-neutral-800/70 lg:sticky lg:top-[117px] lg:backdrop-blur-sm' : 'hover:bg-neutral-800/30'
        ]">
        <div class="px-2 flex items-center justify-center gap-1">
          <!-- Bulk Selection Mode: Show Checkbox -->
          <template v-if="bulkSelectionMode">
            <button
              @click="toggleTrackSelection(track.id)"
              class="text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect v-if="!selectedTrackIds.has(track.id)" x="4" y="4" width="16" height="16" rx="2" stroke-width="2" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </template>
          
          <!-- Stem Player Mode: Show Mute/Solo -->
          <template v-else-if="isStemPlayerActive">
            <button @click="toggleMute(track.id)"
              :class="[
                'px-2 py-1 text-xs rounded transition-colors cursor-pointer',
                getStemTrack(track.id)?.isMuted
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              ]"
              :title="getStemTrack(track.id)?.isMuted ? 'Unmute' : 'Mute'">
              M
            </button>
            <button @click="toggleSolo(track.id)"
              :class="[
                'px-2 py-1 text-xs rounded transition-colors cursor-pointer',
                getStemTrack(track.id)?.isSolo
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              ]"
              :title="getStemTrack(track.id)?.isSolo ? 'Unsolo' : 'Solo'">
              S
            </button>
          </template>
          
          <!-- Normal Mode: Show Play Button -->
          <button v-else @click="handlePlayClick(track, index)"
            :class="['text-neutral-400 hover:text-white transition-colors cursor-pointer', isCurrentlyPlaying(track) ? 'text-orange-400' : '']"
            :title="isCurrentlyPlaying(track) ? 'Pause' : 'Play'">
            <svg v-if="isCurrentlyPlaying(track)" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
        <div class="overflow-hidden">
          <NuxtLink :to="`/u/${username}/t/${generateTrackSlug(track)}`"
            :class="['flex items-center justify-between gap-2 hover:text-white transition-colors hover:underline'] + (isCurrentlyPlaying(track) ? ' font-bold text-white' : '')">
            <span class="truncate">{{ track.title || 'Untitled' }}</span>
            <span v-if="track.is_public === false" class="text-xs text-neutral-500 flex-shrink-0">[private]</span>
          </NuxtLink>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.artist || 'Unknown' }}</div>
        <div class="text-neutral-400">{{ track.version || 'v1.0' }}</div>
        <div class="text-neutral-400 overflow-hidden">
          <template v-if="track.collections && track.collections.length > 0">
            <div class="flex flex-wrap gap-1">
              <NuxtLink 
                v-for="collection in track.collections" 
                :key="collection.slug"
                :to="`/u/${username}/c/${collection.slug}`" 
                class="inline-flex items-center px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-200 hover:text-white transition-colors whitespace-nowrap"
              >
                {{ collection.name }}
              </NuxtLink>
            </div>
          </template>
          <template v-else>-</template>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.genre || '-' }}</div>
        <div class="text-neutral-400">{{ track.bpm || '-' }}</div>
        <div class="text-neutral-400">{{ formatDuration(track.duration) }}</div>
        <div v-if="isOwnProfile" class="text-neutral-400 overflow-hidden">
          <select 
            v-if="statuses.length > 0"
            :value="track.status_id || ''"
            @change="updateTrackStatus(track.id, $event.target.value ? parseInt($event.target.value) : null)"
            class="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 rounded text-xs text-neutral-200 cursor-pointer outline-none"
          >
            <option value="">No Status</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>
          <div v-else class="text-xs px-2 py-1">Loading...</div>
        </div>
        <div v-if="isOwnProfile">
          <button @click="$emit('edit-track', track)" class="text-neutral-500 hover:text-amber-300 text-sm cursor-pointer bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md p-2 py-0.5"
            title="Edit track">
            Edit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { usePlayer } from '~/composables/usePlayer'
import { useStemPlayer } from '~/composables/useStemPlayer'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import LoadingLogo from '~/components/LoadingLogo.vue'
import BulkActionsDrawer from '~/components/BulkActionsDrawer.vue'

interface Props {
  tracks: any[]
  sourceId: string
  isOwnProfile: boolean
  loading: boolean
  username: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'edit-track': [track: any]
  'tracks-deleted': []
}>()

const { currentTrack, isPlaying, loadQueue, togglePlayPause } = usePlayer()
const { isStemPlayerActive, stemTracks, toggleMute, toggleSolo } = useStemPlayer()
const { supabase } = useSupabase()
const { user } = useAuth()
const { showProcessing, showSuccess, showError, removeToast } = useToast()

const statuses = ref<Array<{ id: number; name: string }>>([])

// Bulk selection state
const bulkSelectionMode = ref(false)
const selectedTrackIds = ref(new Set<number>())
const clickCount = ref(0)
const showBulkActionsDrawer = ref(false)

const hasSelections = computed(() => selectedTrackIds.value.size > 0)

// Get selected tracks as array
const selectedTracksArray = computed(() => {
  return props.tracks.filter(track => selectedTrackIds.value.has(track.id))
})

// Handle scroll-to-track event
const handleScrollToTrack = (event: CustomEvent) => {
  const trackId = event.detail?.trackId
  if (!trackId) return
  
  // Find the track element
  const trackElement = document.querySelector(`[data-track-id="${trackId}"]`)
  if (trackElement) {
    trackElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// Fetch statuses for the current user (moved to top of file)

onMounted(async () => {
  window.addEventListener('scroll-to-track', handleScrollToTrack as EventListener)
  await fetchStatuses()
})

onUnmounted(() => {
  window.removeEventListener('scroll-to-track', handleScrollToTrack as EventListener)
})

// Watch for user becoming available and refetch statuses
watch([() => user.value, () => props.isOwnProfile], async ([newUser, newIsOwnProfile]) => {
  if (newUser && newIsOwnProfile) {
    await fetchStatuses()
  }
}, { immediate: true })

const generateTrackSlug = (track: any): string => {
  // Use title + ID as slug, fallback to just ID
  if (track.title) {
    const slug = track.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `${slug}-${track.id}`
  }
  return `track-${track.id}`
}

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds === 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const isCurrentlyPlaying = (track: any): boolean => {
  return currentTrack.value?.id === track.id && isPlaying.value
}

// Get stem track by ID for mute/solo state
const getStemTrack = (trackId: number) => {
  return stemTracks.value.find(t => t.id === trackId)
}

const handlePlayClick = async (track: any, index: number) => {
  // Don't allow playback if stem player is active
  if (isStemPlayerActive.value) return
  
  // If clicking the currently playing track, just toggle play/pause
  if (currentTrack.value?.id === track.id) {
    await togglePlayPause()
  } else {
    // Load the queue and start playing from this track
    await loadQueue(props.tracks, props.sourceId, index)
  }
}

const handleUploadClick = () => {
  // Dispatch event to open upload modal
  const event = new CustomEvent('open-upload-modal')
  window.dispatchEvent(event)
}

// Fetch statuses for the current user
const fetchStatuses = async () => {
  if (!supabase || !user.value || !props.isOwnProfile) return
  
  try {
    const { data, error } = await supabase
      .from('track_statuses')
      .select('id, name')
      .eq('user_id', user.value.id)
      .order('name')
    
    if (error) throw error
    
    // If user has no statuses, create defaults for them
    if (!data || data.length === 0) {
      await supabase.rpc('create_default_statuses_for_user', { target_user_id: user.value.id })
      
      // Fetch again after creating defaults
      const { data: newData } = await supabase
        .from('track_statuses')
        .select('id, name')
        .eq('user_id', user.value.id)
        .order('name')
      
      statuses.value = newData || []
    } else {
      statuses.value = data
    }
  } catch (error) {
    console.error('Error fetching statuses:', error)
    statuses.value = []
  }
}

// Update track status immediately
const updateTrackStatus = async (trackId: number, statusId: number | null) => {
  if (!supabase) return
  
  try {
    const { error } = await supabase
      .from('sounds')
      .update({ status_id: statusId })
      .eq('id', trackId)
    
    if (error) throw error
    
    // Update local track data
    const track = props.tracks.find(t => t.id === trackId)
    if (track) {
      track.status_id = statusId
      if (statusId === null) {
        track.track_statuses = null
      } else {
        const status = statuses.value.find(s => s.id === statusId)
        if (status) {
          track.track_statuses = { id: status.id, name: status.name }
        }
      }
    }
  } catch (error) {
    console.error('Error updating track status:', error)
  }
}

// Bulk selection handlers
const handleHeaderCheckboxClick = () => {
  clickCount.value++
  
  if (clickCount.value === 1) {
    // Activate bulk mode
    bulkSelectionMode.value = true
    selectedTrackIds.value.clear()
  } else if (clickCount.value === 2) {
    // Select all
    props.tracks.forEach(track => selectedTrackIds.value.add(track.id))
  } else if (clickCount.value === 3) {
    // Deselect all
    selectedTrackIds.value.clear()
  } else {
    // Deactivate bulk mode
    bulkSelectionMode.value = false
    selectedTrackIds.value.clear()
    clickCount.value = 0
  }
}

const toggleTrackSelection = (trackId: number) => {
  if (selectedTrackIds.value.has(trackId)) {
    selectedTrackIds.value.delete(trackId)
  } else {
    selectedTrackIds.value.add(trackId)
  }
}

// Handle tracks deleted from bulk actions drawer
const handleTracksDeleted = () => {
  // Clear selection and exit bulk mode
  bulkSelectionMode.value = false
  selectedTrackIds.value.clear()
  clickCount.value = 0
  showBulkActionsDrawer.value = false
  
  // Notify parent to refetch
  emit('tracks-deleted')
}

// Handle tracks updated from bulk actions drawer
const handleTracksUpdated = () => {
  // Clear selection and exit bulk mode
  bulkSelectionMode.value = false
  selectedTrackIds.value.clear()
  clickCount.value = 0
  showBulkActionsDrawer.value = false
  
  // Notify parent to refetch
  emit('tracks-deleted') // Reuse same event to trigger refetch
}

// Handle bulk actions drawer close
const handleBulkActionsClose = () => {
  showBulkActionsDrawer.value = false
}
</script>

