<template>
  <div class="overflow-x-auto w-full h-fit">
    <div v-if="loading" class="flex items-center justify-center p-8 h-full w-full grow">
      <LoadingLogo />
    </div>

    <!-- Zero State -->
    <div v-else-if="tracks.length === 0" class="py-16 w-full text-center">
      <div class="max-w-md mx-auto">
        <h3 class="text-lg font-medium mb-2 text-neutral-300">
          {{ isOwnProfile && profileUserType === 'audio_pro' ? 'No tracks uploaded yet' : isOwnProfile &&
          profileUserType === 'creator' ? 'No tracks in shortlist' : 'No tracks available' }}
        </h3>
        <p class="text-neutral-500 text-sm mb-6">
          {{ isOwnProfile && profileUserType === 'audio_pro'
          ? 'Start building your music library by uploading your first track.'
          : isOwnProfile && profileUserType === 'creator'
          ? 'Start building your shortlist by adding tracks from audio pro accounts.'
          : 'This user hasn\'t uploaded any tracks yet.'
          }}
        </p>
        <button v-if="isOwnProfile && profileUserType === 'audio_pro'" @click="handleUploadClick"
          class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-900 font-medium rounded transition-colors cursor-pointer">
          Upload Music
        </button>
      </div>
    </div>

    <div v-else class="w-full overflow-x-auto">
      <!-- Bulk Actions Drawer -->
      <BulkActionsDrawer v-model:show="showBulkActionsDrawer" :selected-tracks="selectedTracksArray"
        :selected-count="selectedTrackIds.size" @tracks-deleted="handleTracksDeleted"
        @tracks-updated="handleTracksUpdated" @close="handleBulkActionsClose" />

      <!-- Single Grid Container - wraps header and all rows -->
      <div class="w-fit">
        <!-- Header -->
        <div :class="[
          'text-sm text-left text-neutral-500 border-b border-neutral-800 py-2',
          isOwnProfile 
            ? 'trackGrid-edit' 
            : (viewerUserType === 'creator' && profileUserType === 'audio_pro')
              ? 'trackGrid-edit-no-collection'
              : 'trackGrid-no-collection'
        ]">
          <div class="px-2 flex items-center justify-center">
            <button v-if="isOwnProfile" @click="handleHeaderCheckboxClick"
              class="text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              :title="bulkSelectionMode ? (clickCount === 2 ? 'Deselect all' : 'Select all') : 'Select tracks'">
              <svg v-if="bulkSelectionMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect v-if="clickCount !== 2" x="4" y="4" width="16" height="16" rx="2" stroke-width="2" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke-width="2" />
              </svg>
            </button>
          </div>
          <div>Title</div>
          <div>Artist</div>
          <div>Version</div>
          <div v-if="isOwnProfile">Collection</div>
          <div>Genre</div>
          <div>BPM</div>
          <div>Duration</div>
          <div v-if="isOwnProfile && profileUserType === 'audio_pro'">Status</div>
          <div :class="[
            'flex items-center justify-start',
            isOwnProfile ? 'sticky right-0 bg-neutral-900 z-20 pl-2 pr-4 min-w-[80px]' : ''
          ]">
            <button v-if="isOwnProfile && hasSelections" @click="showBulkActionsDrawer = true"
              class="px-2 py-0.5 bg-amber-400 hover:bg-amber-500 text-neutral-900 text-xs font-medium rounded transition-colors cursor-pointer">
              Bulk ({{ selectedTrackIds.size }})
            </button>
          </div>
        </div>

        <!-- Tracks -->
        <div v-for="(track, index) in tracks" :key="track.id" :data-track-id="track.id" :class="[
          'text-sm border-b border-neutral-800/50 py-3 transition-colors items-center',
          isOwnProfile 
            ? 'trackGrid-edit' 
            : (viewerUserType === 'creator' && profileUserType === 'audio_pro')
              ? 'trackGrid-edit-no-collection'
              : 'trackGrid-no-collection',
          isCurrentlyPlaying(track) ? 'bg-neutral-800/70' : 'hover:bg-neutral-800/30'
        ]">
        <div class="px-2 flex items-center justify-center gap-1">
          <!-- Bulk Selection Mode: Show Checkbox -->
          <template v-if="bulkSelectionMode">
            <button @click="toggleTrackSelection(track.id)"
              class="text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect v-if="!selectedTrackIds.has(track.id)" x="4" y="4" width="16" height="16" rx="2"
                  stroke-width="2" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </template>

          <!-- Stem Player Mode: Show Mute/Solo -->
          <template v-else-if="isStemPlayerActive">
            <button @click="toggleMute(track.id)" :class="[
                'px-2 py-1 text-xs rounded transition-colors cursor-pointer',
                getStemTrack(track.id)?.isMuted
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              ]" :title="getStemTrack(track.id)?.isMuted ? 'Unmute' : 'Mute'">
              M
            </button>
            <button @click="toggleSolo(track.id)" :class="[
                'px-2 py-1 text-xs rounded transition-colors cursor-pointer',
                getStemTrack(track.id)?.isSolo
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              ]" :title="getStemTrack(track.id)?.isSolo ? 'Unsolo' : 'Solo'">
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
          <NuxtLink :to="`/u/${getTrackOwnerUsername(track)}/t/${generateTrackSlug(track)}`"
            :class="['flex items-center justify-between gap-2 hover:text-white transition-colors hover:underline'] + (isCurrentlyPlaying(track) ? ' font-bold text-white' : '')">
            <span class="truncate">{{ track.title || 'Untitled' }}</span>
            <span v-if="track.is_public === false" class="text-xs text-neutral-500 flex-shrink-0">[private]</span>
          </NuxtLink>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.artist || 'Unknown' }}</div>
        <div class="text-neutral-400">{{ track.version || 'v1.0' }}</div>
        <div v-if="isOwnProfile" class="text-neutral-400 overflow-hidden">
          <!-- Editing Collections -->
          <div v-if="editingCollectionTrackId === track.id"
            class="flex flex-row gap-1 items-center border border-neutral-800 hover:border-neutral-700 focus:border-neutral-700 rounded-md p-1">
            <select v-if="!showNewCollectionInput" ref="collectionSelectRef" v-model="selectedCollectionId"
              class="px-1 text-xs rounded text-neutral-200 outline-none bg-neutral-800 border border-neutral-700 min-w-[80px] w-auto"
              @change="handleCollectionSelectChange">
              <option value="Select...">Select...</option>
              <option v-for="collection in userCollections" :key="collection.id" :value="collection.id">
                {{ collection.name }}
              </option>
              <option value="__new__">+ Create new collection</option>
            </select>
            <input v-else ref="newCollectionInputRef" v-model="newCollectionName" type="text"
              class="px-2 py-1 text-xs rounded text-neutral-200 outline-none bg-neutral-800 border border-neutral-700 min-w-[80px] w-auto"
              placeholder="Collection name" @keyup.enter="saveCollection" @keyup.esc="cancelEditingCollection"
              @input="adjustInputWidth" />
            <button @click="cancelEditingCollection"
              class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer flex-shrink-0" title="Cancel">
              <Xmark class="w-[10px] h-[10px]" />
            </button>
            <button @click="saveCollection"
              class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer flex-shrink-0" title="Save">
              <Check class="w-[10px] h-[10px]" />
            </button>
          </div>
          <!-- Existing Collections -->
          <template v-else>
            <template v-if="track.collections && track.collections.length > 0">
              <div class="flex flex-nowrap gap-1">
                <NuxtLink v-for="collection in track.collections" :key="collection.slug"
                  :to="`/u/${getTrackOwnerUsername(track)}/c/${collection.slug}`"
                  class="inline-flex items-center px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-200 hover:text-white transition-colors whitespace-nowrap">
                  {{ collection.name }}
                </NuxtLink>
              </div>
            </template>
            <!-- Empty state with + icon -->
            <button v-else @click="startEditingCollection(track.id)"
              class="p-1 bg-neutral-800 rounded hover:bg-neutral-700 transition-colors cursor-pointer border border-neutral-700"
              title="Add to collection">
              <Plus class="w-2.5 h-2.5 max-w-2.5 max-h-2.5" />
            </button>
          </template>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.genre || '-' }}</div>
        <div class="text-neutral-400">{{ track.bpm || '-' }}</div>
        <div class="text-neutral-400">{{ formatDuration(track.duration) }}</div>
        <div v-if="isOwnProfile && profileUserType === 'audio_pro'" class="text-neutral-400 overflow-hidden">
          <select v-if="statuses.length > 0" :value="track.status_id || ''"
            @change="updateTrackStatus(track.id, $event.target.value ? parseInt($event.target.value) : null)"
            class="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 rounded text-xs text-neutral-200 cursor-pointer outline-none">
            <option value="">No Status</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>
          <div v-else class="text-xs px-2 py-1">Loading...</div>
        </div>
        <!-- Action Button: Edit / Add / Remove -->
        <div :class="[
          (isOwnProfile || (viewerUserType === 'creator' && profileUserType === 'audio_pro')) 
            ? 'sticky right-0 bg-neutral-900 z-10 pl-2 pr-4 min-w-[80px]' 
            : '',
          isCurrentlyPlaying(track) ? 'bg-neutral-800/70' : ''
        ]">
          <!-- Edit button for audio_pro owners -->
          <button v-if="isOwnProfile && profileUserType === 'audio_pro'" @click="$emit('edit-track', track)"
            class="text-neutral-500 hover:text-amber-300 text-sm cursor-pointer bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md p-2 py-0.5"
            title="Edit track">
            Edit
          </button>
          <!-- Add button for creators viewing audio_pro profiles -->
          <button
            v-else-if="!isOwnProfile && viewerUserType === 'creator' && profileUserType === 'audio_pro' && !shortlistedTrackIds.has(track.id)"
            @click="handleAddToShortlist(track.id)" :disabled="shortlistLoading.has(track.id)"
            class="text-neutral-500 hover:text-green-300 text-sm cursor-pointer bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md p-2 py-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            :title="shortlistLoading.has(track.id) ? 'Adding...' : 'Add to shortlist'">
            {{ shortlistLoading.has(track.id) ? 'Adding...' : 'Add' }}
          </button>
          <!-- Already added state -->
          <button
            v-else-if="!isOwnProfile && viewerUserType === 'creator' && profileUserType === 'audio_pro' && shortlistedTrackIds.has(track.id)"
            disabled
            class="text-green-400 text-sm cursor-not-allowed bg-neutral-800/50 rounded-md p-2 py-0.5 opacity-50"
            title="Already in shortlist">
            Added
          </button>
          <!-- Remove button for creators viewing their own shortlist -->
          <button v-else-if="isOwnProfile && viewerUserType === 'creator'" @click="handleRemoveFromShortlist(track.id)"
            :disabled="shortlistLoading.has(track.id)"
            class="text-neutral-500 hover:text-red-300 text-sm cursor-pointer bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md p-2 py-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            :title="shortlistLoading.has(track.id) ? 'Removing...' : 'Remove from shortlist'">
            {{ shortlistLoading.has(track.id) ? 'Removing...' : 'Remove' }}
          </button>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed, nextTick } from 'vue'
import { usePlayer } from '~/composables/usePlayer'
import { useStemPlayer } from '~/composables/useStemPlayer'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import LoadingLogo from '~/components/LoadingLogo.vue'
import BulkActionsDrawer from '~/components/BulkActionsDrawer.vue'
import { addTrackToShortlist, removeTrackFromShortlist, checkIfTracksAreShortlisted } from '~/utils/shortlist'
import { generateUniqueSlug } from '~/utils/collections'
import { Plus, Check, Xmark } from '@iconoir/vue'

interface Props {
  tracks: any[]
  sourceId: string
  isOwnProfile: boolean
  loading: boolean
  username: string
  viewerUserType?: 'creator' | 'audio_pro' | null
  profileUserType?: 'creator' | 'audio_pro' | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'edit-track': [track: any]
  'tracks-deleted': []
  'track-shortlisted': [trackId: number]
  'track-unshortlisted': [trackId: number]
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

// Shortlist state
const shortlistedTrackIds = ref(new Set<number>())
const shortlistLoading = ref(new Set<number>()) // Track IDs being added/removed

// Collection editing state
const editingCollectionTrackId = ref<number | null>(null)
const selectedCollectionId = ref<number | string | null>(null)
const newCollectionName = ref('')
const showNewCollectionInput = ref(false)
const userCollections = ref<Array<{ id: number; name: string; slug: string }>>([])
const collectionSelectRef = ref<HTMLSelectElement | null>(null)
const newCollectionInputRef = ref<HTMLInputElement | null>(null)

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
      const defaultStatuses = [
        { name: 'Available' },
        { name: 'Used' },
        { name: 'Non-exclusive' },
        { name: 'Exclusive' },
        { name: 'Royalty Free' }
      ]
      
      const { data: newStatuses, error: insertError } = await supabase
        .from('track_statuses')
        .insert(defaultStatuses.map(s => ({ ...s, user_id: user.value!.id })))
        .select('id, name')
      
      if (insertError) throw insertError
      statuses.value = newStatuses || []
    } else {
      statuses.value = data
    }
  } catch (error) {
    console.error('Error fetching statuses:', error)
  }
}

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

// Get the track owner's username
// For shortlisted tracks, use original_owner.username
// For regular tracks, use the profile username prop
const getTrackOwnerUsername = (track: any): string => {
  // Shortlisted tracks have original_owner with username
  if (track.original_owner?.username) {
    return track.original_owner.username
  }
  // Regular tracks use the profile username
  return props.username
}

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

// Check if track is the current track (regardless of playing state)
const isCurrentTrack = (track: any): boolean => {
  if (!currentTrack.value || !track) return false
  // Use String() to ensure type-safe comparison (IDs might be numbers or strings)
  return String(currentTrack.value.id) === String(track.id)
}

// Get stem track by ID for mute/solo state
const getStemTrack = (trackId: number) => {
  return stemTracks.value.find(t => t.id === trackId)
}

const handlePlayClick = async (track: any, index: number) => {
  // Don't allow playback if stem player is active
  if (isStemPlayerActive.value) return
  
  // If clicking the current track (regardless of play/pause state), just toggle play/pause
  // This ensures pausing/resuming doesn't restart the track
  if (isCurrentTrack(track)) {
    console.log('handlePlayClick: Toggling play/pause for current track', { 
      trackId: track.id, 
      isPlaying: isPlaying.value
    })
    await togglePlayPause()
  } else {
    // Load the queue and start playing from this track
    console.log('handlePlayClick: Loading new queue', { 
      trackId: track.id, 
      currentTrackId: currentTrack.value?.id 
    })
    await loadQueue(props.tracks, props.sourceId, index)
  }
}

const handleUploadClick = () => {
  // Dispatch event to open upload modal
  const event = new CustomEvent('open-upload-modal')
  window.dispatchEvent(event)
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

// Shortlist functions
const handleAddToShortlist = async (trackId: number) => {
  if (!user.value || shortlistLoading.value.has(trackId)) return
  
  shortlistLoading.value.add(trackId)
  const toastId = showProcessing('Adding track to shortlist...')
  
  try {
    const result = await addTrackToShortlist(trackId, user.value.id)
    
    if (result.success) {
      shortlistedTrackIds.value.add(trackId)
      removeToast(toastId)
      showSuccess('Track added to shortlist')
      emit('track-shortlisted', trackId)
    } else {
      removeToast(toastId)
      showError(result.error?.message || 'Failed to add track to shortlist')
    }
  } catch (error) {
    removeToast(toastId)
    showError('Failed to add track to shortlist')
    console.error('Error adding to shortlist:', error)
  } finally {
    shortlistLoading.value.delete(trackId)
  }
}

const handleRemoveFromShortlist = async (trackId: number) => {
  if (!user.value || shortlistLoading.value.has(trackId)) return
  
  shortlistLoading.value.add(trackId)
  const toastId = showProcessing('Removing track from shortlist...')
  
  try {
    const result = await removeTrackFromShortlist(trackId, user.value.id)
    
    if (result.success) {
      shortlistedTrackIds.value.delete(trackId)
      removeToast(toastId)
      showSuccess('Track removed from shortlist')
      emit('track-unshortlisted', trackId)
    } else {
      removeToast(toastId)
      showError(result.error?.message || 'Failed to remove track from shortlist')
    }
  } catch (error) {
    removeToast(toastId)
    showError('Failed to remove track from shortlist')
    console.error('Error removing from shortlist:', error)
  } finally {
    shortlistLoading.value.delete(trackId)
  }
}

// Check which tracks are already shortlisted (when viewing audio_pro profile as creator)
const checkShortlistStatus = async () => {
  if (!user.value || !props.tracks.length || props.viewerUserType !== 'creator') return
  
  try {
    const trackIds = props.tracks.map(t => t.id)
    const shortlisted = await checkIfTracksAreShortlisted(trackIds, user.value.id)
    shortlistedTrackIds.value = shortlisted
  } catch (error) {
    console.error('Error checking shortlist status:', error)
  }
}

// Watch for tracks changes to check shortlist status
watch(() => props.tracks, async () => {
  if (props.tracks.length > 0 && !props.isOwnProfile && props.viewerUserType === 'creator' && props.profileUserType === 'audio_pro') {
    await checkShortlistStatus()
  }
}, { immediate: true })

// Watch for user becoming available to check shortlist status
watch([() => user.value, () => props.tracks, () => props.viewerUserType, () => props.profileUserType], async () => {
  if (user.value && props.tracks.length > 0 && !props.isOwnProfile && props.viewerUserType === 'creator' && props.profileUserType === 'audio_pro') {
    await checkShortlistStatus()
  }
})

// Fetch user's collections
const fetchUserCollections = async () => {
  if (!supabase || !user.value || !props.isOwnProfile) return
  
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, slug')
      .eq('user_id', user.value.id)
      .order('name')
    
    if (error) throw error
    
    userCollections.value = (data || []).map((c: any) => ({
      id: c.id as number,
      name: c.name as string,
      slug: c.slug as string
    }))
  } catch (error) {
    console.error('Error fetching user collections:', error)
  }
}

// Start editing collection for a track
const startEditingCollection = async (trackId: number) => {
  if (!user.value) return
  
  editingCollectionTrackId.value = trackId
  selectedCollectionId.value = null
  newCollectionName.value = ''
  showNewCollectionInput.value = false
  
  // Fetch collections if not already loaded
  if (userCollections.value.length === 0) {
    await fetchUserCollections()
  }
}

// Handle collection select change
const handleCollectionSelectChange = () => {
  if (selectedCollectionId.value === '__new__') {
    showNewCollectionInput.value = true
    selectedCollectionId.value = null
  }
}

// Cancel editing collection
const cancelEditingCollection = () => {
  editingCollectionTrackId.value = null
  selectedCollectionId.value = null
  newCollectionName.value = ''
  showNewCollectionInput.value = false
}

// Save collection (add track to collection)
const saveCollection = async () => {
  if (!supabase || !user.value || !editingCollectionTrackId.value) return
  
  const trackId = editingCollectionTrackId.value
  let collectionId: number | null = null
  
  const toastId = showProcessing('Adding track to collection...')
  
  try {
    // If creating new collection
    if (showNewCollectionInput.value && newCollectionName.value.trim()) {
      // Get existing slugs to ensure uniqueness
      const { data: existing } = await supabase
        .from('collections')
        .select('slug')
        .eq('user_id', user.value.id)
      
      const existingSlugs = (existing || []).map((c: any) => c.slug)
      const slug = generateUniqueSlug(newCollectionName.value.trim(), existingSlugs)
      
      // Create the collection
      const { data: newCollection, error: createError } = await supabase
        .from('collections')
        .insert({
          user_id: user.value.id,
          name: newCollectionName.value.trim(),
          description: null,
          slug
        })
        .select()
        .single()
      
      if (createError) throw createError
      
      collectionId = newCollection.id as number
      
      // Add to userCollections for immediate UI update
      userCollections.value.push({
        id: newCollection.id as number,
        name: newCollection.name as string,
        slug: newCollection.slug as string
      })
    } else if (selectedCollectionId.value) {
      collectionId = typeof selectedCollectionId.value === 'number' 
        ? selectedCollectionId.value 
        : parseInt(selectedCollectionId.value as string)
    } else {
      removeToast(toastId)
      showError('Please select a collection or create a new one')
      return
    }
    
    if (!collectionId) {
      removeToast(toastId)
      showError('Invalid collection')
      return
    }
    
    // Check if track is already in this collection
    const { data: existing } = await supabase
      .from('collections_sounds')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('sound_id', trackId)
      .single()
    
    if (existing) {
      removeToast(toastId)
      showSuccess('Track is already in this collection')
      cancelEditingCollection()
      emit('tracks-deleted') // Trigger refetch to update UI
      return
    }
    
    // Add track to collection
    const { error: insertError } = await supabase
      .from('collections_sounds')
      .insert({
        collection_id: collectionId,
        sound_id: trackId,
        hidden: false
      })
    
    if (insertError) throw insertError
    
    removeToast(toastId)
    showSuccess('Track added to collection')
    cancelEditingCollection()
    emit('tracks-deleted') // Trigger refetch to update UI
  } catch (error) {
    removeToast(toastId)
    showError('Failed to add track to collection')
    console.error('Error saving collection:', error)
  }
}

// Get select width based on longest collection name
const getSelectWidth = (): number => {
  if (userCollections.value.length === 0) return 150
  
  const longestName = Math.max(
    'Select collection...'.length,
    '+ Create new collection'.length,
    ...userCollections.value.map(c => c.name.length)
  )
  
  // Approximate width: ~7px per character + padding
  return Math.max(150, Math.min(250, longestName * 7 + 30))
}

// Get input width based on content
const getInputWidth = (): number => {
  const text = newCollectionName.value || 'Collection name'
  // Approximate width: ~7px per character + padding
  return Math.max(150, Math.min(300, text.length * 7 + 30))
}

// Adjust input width based on content (for real-time updates)
const adjustInputWidth = () => {
  if (newCollectionInputRef.value) {
    const width = getInputWidth()
    newCollectionInputRef.value.style.width = `${width}px`
  }
}

// Watch for user and isOwnProfile to fetch collections
watch([() => user.value, () => props.isOwnProfile], async () => {
  if (user.value && props.isOwnProfile) {
    await fetchUserCollections()
  }
}, { immediate: true })

// Watch for newCollectionName changes to adjust width
watch(() => newCollectionName.value, () => {
  if (showNewCollectionInput.value) {
    nextTick(() => {
      adjustInputWidth()
    })
  }
})
</script>

