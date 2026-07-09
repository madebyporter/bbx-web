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
        <Button v-if="isOwnProfile && profileUserType === 'audio_pro'" @click="handleUploadClick">
          Upload Music
        </Button>
      </div>
    </div>

    <div v-else class="w-full overflow-x-auto">
      <!-- Bulk Actions Drawer -->
      <BulkActionsDrawer v-model:show="showBulkActionsDrawer" :selected-tracks="selectedTracksArray"
        :selected-count="selectedTrackIds.size" @tracks-deleted="handleTracksDeleted"
        @tracks-updated="handleTracksUpdated" @close="handleBulkActionsClose" />

      <Modal
        v-model:show="showCollectionModal"
        :anchor-rect="collectionModalAnchor"
        :title="collectionModalTitle"
        @close="resetCollectionModal"
      >
        <CollectionPicker
          v-if="showCollectionModal"
          v-model="selectedCollectionIds"
          :collections="userCollections"
          :disabled="collectionSaving"
          @create-collection="queueCollectionCreation"
        />
        <template #footer>
          <Button variant="ghost" :disabled="collectionSaving" @click="closeCollectionModal">
            Cancel
          </Button>
          <Button :disabled="collectionSaving" @click="saveCollections">
            {{ collectionSaving ? 'Saving…' : 'Save' }}
          </Button>
        </template>
      </Modal>

      <!-- Single Grid Container - wraps header and all rows -->
      <div class="w-fit md:w-full h-fit">
        <!-- Header -->
        <div
          :class="[
            'text-sm text-left text-neutral-500 border-b border-neutral-800 py-2 bg-neutral-900 *:flex *:items-center',
          ]"
          :style="tableGridStyle"
        >
          <div class="px-2 flex items-center justify-center">
            <Button
              v-if="isOwnProfile"
              variant="ghost"
              class="!p-0 text-neutral-500 hover:text-neutral-300"
              :title="bulkSelectionMode ? (clickCount === 2 ? 'Deselect all' : 'Select all') : 'Select tracks'"
              @click="handleHeaderCheckboxClick"
            >
              <svg v-if="bulkSelectionMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect v-if="clickCount !== 2" x="4" y="4" width="16" height="16" rx="2" stroke-width="2" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke-width="2" />
              </svg>
            </Button>
          </div>
          <div>Title</div>
          <div>Artist</div>
          <div>Version</div>
          <template v-if="analyticsMode && isOwnProfile">
            <div>Plays</div>
            <div>Listeners</div>
            <div>Avg Listen</div>
            <div>Completion</div>
          </template>
          <template v-else>
            <div v-if="showCollectionColumn">Collection</div>
          <div>Genre</div>
          <div>BPM</div>
          <div>Duration</div>
            <div v-if="showStatusColumn">Status</div>
          </template>
          <div :class="[
            'flex items-center justify-start',
            showActionsColumn ? 'sticky right-0 bg-neutral-900 z-20 pl-2 pr-4 min-w-[88px]' : ''
          ]">
            <Button
              v-if="isOwnProfile && hasSelections"
              variant="primary"
              size="sm"
              class="!px-2 !py-0.5 !bg-amber-400 hover:!bg-amber-500 text-neutral-900 text-xs whitespace-nowrap"
              @click="showBulkActionsDrawer = true"
            >
              Bulk ({{ selectedTrackIds.size }})
            </Button>
          </div>
        </div>

        <!-- Tracks -->
        <div v-for="(track, index) in tracks" :key="track.id" :data-track-id="track.id" :class="[
          'text-sm border-b border-neutral-900 *:py-4 items-center',
          isCurrentlyPlaying(track) ? 'bg-neutral-800/70  lg:top-0 lg:backdrop-blur-sm' : 'hover:bg-neutral-800 hover:*:bg-neutral-800'
        ]" :style="tableGridStyle">
        <div class="px-2 flex items-center justify-center gap-1">
          <!-- Bulk Selection Mode: Show Checkbox -->
          <template v-if="bulkSelectionMode">
            <Button variant="ghost" class="!p-0 text-neutral-400 hover:text-neutral-200" @click="toggleTrackSelection(track.id)">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect v-if="!selectedTrackIds.has(track.id)" x="4" y="4" width="16" height="16" rx="2"
                  stroke-width="2" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Button>
          </template>

          <!-- Stem Player Mode: Show Mute/Solo -->
          <template v-else-if="isStemPlayerActive">
            <Button
              variant="ghost"
              size="sm"
              :class="[
                '!px-2 !py-1 text-xs rounded transition-colors',
                getStemTrack(track.id)?.isMuted
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              ]"
              :title="getStemTrack(track.id)?.isMuted ? 'Unmute' : 'Mute'"
              @click="toggleMute(track.id)"
            >
              M
            </Button>
            <Button
              variant="ghost"
              size="sm"
              :class="[
                '!px-2 !py-1 text-xs rounded transition-colors',
                getStemTrack(track.id)?.isSolo
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              ]"
              :title="getStemTrack(track.id)?.isSolo ? 'Unsolo' : 'Solo'"
              @click="toggleSolo(track.id)"
            >
              S
            </Button>
          </template>

          <!-- Normal Mode: Show Play Button -->
          <PlayerButton
            v-else
            variant="ghost"
            :class="isCurrentlyPlaying(track) ? 'text-orange-400' : ''"
            :title="isCurrentlyPlaying(track) ? 'Pause' : 'Play'"
            @click="handlePlayClick(track, index)"
          >
            <svg v-if="isCurrentlyPlaying(track)" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </PlayerButton>
        </div>
        <div class="overflow-hidden">
          <NuxtLink
            :to="`/u/${getTrackOwnerUsername(track)}/t/${generateTrackSlug(track)}`"
            class="flex min-w-0 w-full items-center justify-between gap-2 text-neutral-300 hover:text-white hover:underline"
            :class="isCurrentlyPlaying(track) ? 'font-bold text-white' : ''"
          >
            <span class="truncate">{{ track.title || 'Untitled' }}</span>
            <span v-if="track.is_public === false" class="text-xs text-neutral-500 flex-shrink-0">[private]</span>
          </NuxtLink>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.artist || 'Unknown' }}</div>
        <div class="text-neutral-400">{{ track.version || 'v1.0' }}</div>
        <template v-if="analyticsMode && isOwnProfile">
          <div class="text-neutral-300">{{ formatTrackStat(track.id, 'plays') }}</div>
          <div class="text-neutral-300">{{ formatTrackStat(track.id, 'listeners') }}</div>
          <div class="text-neutral-300">{{ formatTrackStat(track.id, 'avgListen') }}</div>
          <div class="text-neutral-300">{{ formatTrackStat(track.id, 'completion') }}</div>
        </template>
        <template v-else>
        <div v-if="showCollectionColumn" class="text-neutral-400 overflow-visible flex justify-start items-center gap-1">
          <CollectionTagsCell
            :collections="track.collections"
            :owner-username="getTrackOwnerUsername(track)"
          />
          <div
            class="cursor-pointer p-1 bg-transparent rounded hover:bg-neutral-700 border border-neutral-700"
            title="Manage collections"
            @click="openCollectionModal(track, $event)"
          >
            <Plus class="size-3" />
        </div>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.genre || '-' }}</div>
        <div class="text-neutral-400">{{ track.bpm || '-' }}</div>
        <div class="text-neutral-400">{{ formatDuration(track.duration) }}</div>
        <div v-if="showStatusColumn" class="text-neutral-400 overflow-hidden">
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
        </template>
        <!-- Action Button: Edit / Comment / Add / Remove -->
        <div :class="[
          showActionsColumn
            ? 'sticky right-0 bg-neutral-900 z-10 pl-2 pr-4 min-w-[88px]'
            : '',
          isCurrentlyPlaying(track) ? '!bg-neutral-800' : ''
        ]">
          <div class="flex flex-row items-center gap-1">
          <!-- Edit for audio_pro owners -->
          <Button
            v-if="isOwnProfile && profileUserType === 'audio_pro'"
            variant="ghost"
            size="sm"
            class="text-neutral-500 hover:text-amber-300 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md !p-2"
            title="Edit track"
            @click="$emit('edit-track', track)"
          >
            <EditPencil class="w-4 h-4" />
          </Button>
          <!-- Comments for logged-in users -->
          <Button
            v-if="user"
            variant="ghost"
            size="sm"
            class="text-neutral-500 hover:text-amber-300 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md !p-2"
            title="Comments"
            @click="openTrackComments(track)"
          >
            <ChatBubble class="w-4 h-4" />
          </Button>
          <!-- Add button for creators viewing audio_pro profiles -->
          <Button
            v-if="!isOwnProfile && viewerUserType === 'creator' && profileUserType === 'audio_pro' && !shortlistedTrackIds.has(track.id)"
            variant="ghost"
            size="sm"
            class="text-neutral-500 hover:text-green-300 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md !p-2 !py-0.5"
            :disabled="shortlistLoading.has(track.id)"
            :title="shortlistLoading.has(track.id) ? 'Adding...' : 'Add to shortlist'"
            @click="handleAddToShortlist(track.id)"
          >
            {{ shortlistLoading.has(track.id) ? 'Adding...' : 'Add' }}
          </Button>
          <!-- Already added state -->
          <Button
            v-else-if="!isOwnProfile && viewerUserType === 'creator' && profileUserType === 'audio_pro' && shortlistedTrackIds.has(track.id)"
            variant="ghost"
            size="sm"
            class="text-green-400 bg-neutral-800/50 rounded-md !p-2 !py-0.5 opacity-50 cursor-not-allowed"
            disabled
            title="Already in shortlist"
          >
            Added
          </Button>
          <!-- Remove button for creators viewing their own shortlist -->
          <Button
            v-else-if="isOwnProfile && viewerUserType === 'creator'"
            variant="ghost"
            size="sm"
            class="text-neutral-500 hover:text-red-300 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md !p-2 !py-0.5"
            :disabled="shortlistLoading.has(track.id)"
            :title="shortlistLoading.has(track.id) ? 'Removing...' : 'Remove from shortlist'"
            @click="handleRemoveFromShortlist(track.id)"
          >
            {{ shortlistLoading.has(track.id) ? 'Removing...' : 'Remove' }}
          </Button>
        </div>
        </div>
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
import Modal from '~/components/Modal.vue'
import type { AnchorRect } from '~/components/Modal.vue'
import CollectionPicker from '~/components/CollectionPicker.vue'
import { addTrackToShortlist, removeTrackFromShortlist, checkIfTracksAreShortlisted } from '~/utils/shortlist'
import { generateUniqueSlug } from '~/utils/collections'
import { setPlaybackContext } from '~/composables/useTrackAnalytics'
import { useAnalytics } from '~/composables/useAnalytics'
import {
  formatAnalyticsDuration,
  type TrackAnalyticsRow,
} from '~/composables/useTrackAnalyticsData'
import { Plus, EditPencil, ChatBubble } from '@iconoir/vue'

interface Props {
  tracks: any[]
  sourceId: string
  isOwnProfile: boolean
  loading: boolean
  username: string
  viewerUserType?: 'creator' | 'audio_pro' | null
  profileUserType?: 'creator' | 'audio_pro' | null
  analyticsMode?: boolean
  trackStats?: Map<number, TrackAnalyticsRow>
  analyticsLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  analyticsMode: false,
  analyticsLoading: false,
})
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
const { capture } = useAnalytics()

const statuses = ref<Array<{ id: number; name: string }>>([])

// Bulk selection state
const bulkSelectionMode = ref(false)
const selectedTrackIds = ref(new Set<number>())
const clickCount = ref(0)
const showBulkActionsDrawer = ref(false)

// Shortlist state
const shortlistedTrackIds = ref(new Set<number>())
const shortlistLoading = ref(new Set<number>()) // Track IDs being added/removed

// Collection modal state
const showCollectionModal = ref(false)
const collectionModalTrack = ref<{ id: number; title?: string; track_group_name?: string } | null>(null)
const collectionModalAnchor = ref<AnchorRect | null>(null)
const selectedCollectionIds = ref<number[]>([])
const pendingCollections = ref<Array<{ tempId: number; name: string }>>([])
const userCollections = ref<Array<{ id: number; name: string; slug: string }>>([])
const collectionSaving = ref(false)

const collectionModalTitle = computed(() => {
  const title = collectionModalTrack.value?.title?.trim()
  return title ? `Collections — ${title}` : 'Collections'
})

const hasSelections = computed(() => selectedTrackIds.value.size > 0)

const showStatusColumn = computed(() =>
  props.isOwnProfile && props.profileUserType === 'audio_pro' && !props.analyticsMode
)

const showCollectionColumn = computed(() =>
  props.isOwnProfile && !props.analyticsMode
)

const tableGridStyle = computed(() => {
  const cols = [
    'minmax(70px, auto)',
    'minmax(250px, 1fr)',
    '100px',
    '70px',
  ]

  if (props.analyticsMode && props.isOwnProfile) {
    cols.push('70px', '70px', '120px', '90px', '100px')
  } else {
    if (showCollectionColumn.value) {
      cols.push('minmax(140px, max-content)')
    }
    cols.push('70px', '50px', '70px')
    if (showStatusColumn.value) {
      cols.push('100px')
    }
    cols.push('88px')
  }

  return {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: cols.join(' '),
  }
})

const showActionsColumn = computed(() => {
  return !!(
    user.value ||
    props.isOwnProfile ||
    (props.viewerUserType === 'creator' && props.profileUserType === 'audio_pro')
  )
})

const openTrackComments = (track: any) => {
  const event = new CustomEvent('open-track-comments', {
    detail: {
      track: { id: track.id, title: track.title },
      collectionId: null,
    },
    bubbles: true,
    composed: true,
  })
  window.dispatchEvent(event)
}

function formatTrackStat(trackId: number, field: 'plays' | 'listeners' | 'avgListen' | 'completion'): string {
  if (props.analyticsLoading) return '—'
  const stat = props.trackStats?.get(trackId)
  if (!stat) {
    return field === 'avgListen' ? '0:00 (0%)' : field === 'completion' ? '0%' : '0'
  }
  if (field === 'plays') return stat.plays.toLocaleString()
  if (field === 'listeners') return stat.listeners.toLocaleString()
  if (field === 'avgListen') return `${formatAnalyticsDuration(stat.avgDuration)} (${stat.avgPercent}%)`
  return `${stat.completionRate}%`
}

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
    await togglePlayPause()
  } else {
    // Load the queue and start playing from this track
    setPlaybackContext({ source: 'library', collectionId: null })
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
      const track = props.tracks.find((t) => t.id === trackId)
      capture('shortlist_added', {
        track_id: trackId,
        audio_pro_id: track?.user_id ?? track?.original_owner?.id ?? '',
      })
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
      capture('shortlist_removed', { track_id: trackId })
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

function rectToAnchor(rect: DOMRect): AnchorRect {
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  }
}

const loadTrackCollections = async (trackId: number) => {
  if (!supabase) return

  try {
    const { data, error } = await supabase
      .from('collections_sounds')
      .select('collection_id')
      .eq('sound_id', trackId)

    if (error) throw error
    selectedCollectionIds.value = (data || []).map(item => item.collection_id)
  } catch (error) {
    console.error('Error loading track collections:', error)
    selectedCollectionIds.value = []
  }
}

const resetCollectionModal = () => {
  collectionModalTrack.value = null
  collectionModalAnchor.value = null
  selectedCollectionIds.value = []
  pendingCollections.value = []
  collectionSaving.value = false
}

const closeCollectionModal = () => {
  showCollectionModal.value = false
  resetCollectionModal()
}

const openCollectionModal = async (track: any, event: Event) => {
  if (!user.value) return

  const target = event.currentTarget as HTMLElement | null
  collectionModalAnchor.value = target ? rectToAnchor(target.getBoundingClientRect()) : null
  collectionModalTrack.value = {
    id: track.id,
    title: track.title,
    track_group_name: track.track_group_name,
  }
  pendingCollections.value = []
  selectedCollectionIds.value = []

  if (userCollections.value.length === 0) {
    await fetchUserCollections()
  }
  await loadTrackCollections(track.id)
  showCollectionModal.value = true
}

const queueCollectionCreation = (name: string) => {
  if (!name.trim()) return

  const tempId = -Date.now() - Math.random() * 1000
  const tempCollection = {
    id: tempId,
    name: name.trim(),
    slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
  }

  userCollections.value.push(tempCollection)

  if (!selectedCollectionIds.value.includes(tempId)) {
    selectedCollectionIds.value.push(tempId)
  }

  pendingCollections.value.push({ tempId, name: name.trim() })
}

const autoHideOlderVersions = async (
  trackId: number,
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
      .neq('id', trackId)

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

const syncTrackCollections = async (trackId: number, trackGroupName?: string) => {
  if (!supabase) return

  const { data: current, error: fetchError } = await supabase
    .from('collections_sounds')
    .select('collection_id')
    .eq('sound_id', trackId)

  if (fetchError) throw fetchError

  const currentIds = (current || []).map(c => c.collection_id)
  const toAdd = selectedCollectionIds.value.filter(id => !currentIds.includes(id))
  const toRemove = currentIds.filter(id => !selectedCollectionIds.value.includes(id))

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('collections_sounds')
      .delete()
      .eq('sound_id', trackId)
      .in('collection_id', toRemove)

    if (deleteError) throw deleteError
  }

  if (toAdd.length > 0) {
    const collectionsToInsert = toAdd.map(collectionId => ({
      collection_id: collectionId,
      sound_id: trackId,
      hidden: false,
    }))

    const { error: insertError } = await supabase
      .from('collections_sounds')
      .insert(collectionsToInsert)

    if (insertError) throw insertError

    if (trackGroupName) {
      await autoHideOlderVersions(trackId, trackGroupName, toAdd)
    }
  }
}

const saveCollections = async () => {
  if (!supabase || !user.value || !collectionModalTrack.value || collectionSaving.value) return

  collectionSaving.value = true
  const toastId = showProcessing('Saving collections...')

  try {
    if (pendingCollections.value.length > 0) {
      for (const { tempId, name } of pendingCollections.value) {
        const { data: existing } = await supabase
          .from('collections')
          .select('slug')
          .eq('user_id', user.value.id)

        const existingSlugs = (existing || []).map((c: { slug: string }) => c.slug)
        const slug = generateUniqueSlug(name, existingSlugs)

        const { data, error: createError } = await supabase
          .from('collections')
          .insert({
            user_id: user.value.id,
            name,
            description: null,
            slug,
          })
          .select()
          .single()

        if (createError) throw createError

        const tempCollectionIndex = userCollections.value.findIndex(c => c.id === tempId)
        if (tempCollectionIndex !== -1) {
          userCollections.value[tempCollectionIndex] = {
            id: data.id,
            name: data.name,
            slug: data.slug,
          }
        }

        const selectedIndex = selectedCollectionIds.value.indexOf(tempId)
        if (selectedIndex !== -1) {
          selectedCollectionIds.value[selectedIndex] = data.id
        }
      }

      pendingCollections.value = []
    }

    await syncTrackCollections(
      collectionModalTrack.value.id,
      collectionModalTrack.value.track_group_name
    )

    removeToast(toastId)
    showSuccess('Collections updated')
    closeCollectionModal()
    emit('tracks-deleted')
  } catch (error) {
    removeToast(toastId)
    showError('Failed to save collections')
    console.error('Error saving collections:', error)
  } finally {
    collectionSaving.value = false
  }
}

watch([() => user.value, () => props.isOwnProfile], async () => {
  if (user.value && props.isOwnProfile) {
    await fetchUserCollections()
  }
}, { immediate: true })
</script>

