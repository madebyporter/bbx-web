<template>
  <div class="w-full h-full">
    <div v-if="loading" class="flex items-center justify-center p-8">
      <LoadingLogo />
    </div>

    <div v-else-if="tracks.length === 0" class="text-neutral-500 p-4 flex flex-col gap-2">
      <template v-if="noFilterResults && activeFilterChips.length > 0">
        <p>Your filters match no results.</p>
        <p class="flex flex-wrap items-center gap-x-1 gap-y-1">
          <span>Remove:</span>
          <template v-for="(chip, index) in activeFilterChips" :key="chip.id">
            <button
              type="button"
              class="text-link text-amber-400 hover:text-amber-300 no-underline"
              @click="chip.remove()"
            >
              {{ chip.label }}
            </button>
            <span v-if="index < activeFilterChips.length - 1">, </span>
          </template>
        </p>
      </template>
      <template v-else>
        {{ isOwnProfile ? 'No tracks in this collection yet.' : 'No tracks available.' }}
      </template>
    </div>

    <div v-else class="w-full h-fit overflow-x-auto overflow-y-hidden no-scrollbar">
      <!-- Bulk Actions Drawer -->
      <BulkActionsDrawer
        v-model:show="showBulkActionsDrawer"
        :selected-tracks="selectedTracksArray"
        :selected-count="selectedTrackIds.size"
        :collection-id="collectionId"
        :is-collection-context="true"
        @tracks-deleted="handleTracksRemoved"
        @tracks-updated="handleTracksUpdated"
        @close="handleBulkActionsClose"
      />

      <Modal
        v-if="isOwnProfile"
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
        <div :class="[
            'text-sm text-left text-neutral-500 border-b border-neutral-800 py-2 bg-neutral-900 *:flex *:items-center',
            tableGridClass
          ]">
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
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
            <div v-if="user">Collection</div>
            <div>Genre</div>
            <div>BPM</div>
            <div>Duration</div>
            <div v-if="isOwnProfile && profileUserType === 'audio_pro'">Status</div>
          </template>
          <div v-if="showActionsColumn" :class="[
            'flex items-center justify-start',
            'sticky right-0 bg-neutral-900 z-20 pl-2 pr-4 min-w-[88px]'
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
            tableGridClass,
            isCurrentlyPlaying(track) ? 'bg-neutral-800/70  lg:top-0 lg:backdrop-blur-sm' : 'hover:bg-neutral-800 hover:*:bg-neutral-800'
          ]">
        <div class="px-2 flex items-center justify-center">
          <!-- Bulk Selection Mode: Show Checkbox -->
          <template v-if="bulkSelectionMode">
            <Button variant="ghost" class="!p-0 text-neutral-400 hover:text-neutral-200" @click="toggleTrackSelection(track.id)">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect v-if="!selectedTrackIds.has(track.id)" x="4" y="4" width="16" height="16" rx="2" stroke-width="2" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Button>
          </template>
          
          <!-- Normal Mode: Show Play Button -->
          <PlayerButton
            v-else
            variant="art"
            :artwork-url="getArtworkUrl(track.artwork_path)"
            :artwork-is-video="isVideoArtwork(track.artwork_path)"
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
        <div v-if="user" class="text-neutral-400 overflow-visible flex justify-start items-center gap-1">
          <CollectionTagsCell
            :collections="getOwnerCollectionsForTrack(track)"
            :owner-username="username"
            :empty-text="isOwnProfile ? '' : '-'"
          />
          <div
            v-if="isOwnProfile"
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
        <div v-if="isOwnProfile && profileUserType === 'audio_pro'" class="text-neutral-400 overflow-hidden">
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
        </template>
        <div v-if="showActionsColumn" :class="[
          'sticky right-0 bg-neutral-900 z-10 pl-2 pr-4 min-w-[88px]',
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
          <!-- Remove button for creators (remove from collection) -->
          <Button
            v-if="profileUserType === 'creator' && collectionId && !isOwnProfile"
            variant="ghost"
            size="sm"
            class="text-neutral-500 hover:text-red-300 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md !p-2 !py-0.5"
            title="Remove from collection"
            @click="handleRemoveFromCollection(track.id)"
          >
            Remove
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
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import { useToast } from '~/composables/useToast'
import { isVideoArtwork, useArtwork } from '~/composables/useArtwork'
import LoadingLogo from '~/components/LoadingLogo.vue'
import BulkActionsDrawer from '~/components/BulkActionsDrawer.vue'
import Modal from '~/components/Modal.vue'
import type { AnchorRect } from '~/components/Modal.vue'
import CollectionPicker from '~/components/CollectionPicker.vue'
import { generateUniqueSlug } from '~/utils/collections'
import { setPlaybackContext } from '~/composables/useTrackAnalytics'
import {
  formatAnalyticsDuration,
  type TrackAnalyticsRow,
} from '~/composables/useTrackAnalyticsData'
import { EditPencil, ChatBubble, Plus } from '@iconoir/vue'

interface ActiveFilterChip {
  id: string
  label: string
  remove: () => void
}

const props = withDefaults(
  defineProps<{
    tracks: any[]
    sourceId: string
    isOwnProfile: boolean
    loading: boolean
    username: string
    collectionId?: number
    viewerUserType?: 'creator' | 'audio_pro' | null
    profileUserType?: 'creator' | 'audio_pro' | null
    noFilterResults?: boolean
    activeFilterChips?: ActiveFilterChip[]
    analyticsMode?: boolean
    trackStats?: Map<number, TrackAnalyticsRow>
    analyticsLoading?: boolean
  }>(),
  {
    noFilterResults: false,
    activeFilterChips: () => [],
    analyticsMode: false,
    analyticsLoading: false,
  }
)

const emit = defineEmits<{
  'edit-track': [track: any]
  'tracks-removed': []
  'track-removed-from-collection': [trackId: number]
}>()

const { loadQueue, currentTrack, isPlaying, togglePlayPause } = usePlayer()
const { user } = useAuth()
const { supabase } = useSupabase()
const { getArtworkUrl } = useArtwork()
const { showProcessing, showSuccess, showError, removeToast } = useToast()

const statuses = ref<Array<{ id: number; name: string }>>([])

// Bulk selection state
const bulkSelectionMode = ref(false)
const selectedTrackIds = ref(new Set<number>())
const clickCount = ref(0)
const showBulkActionsDrawer = ref(false)

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

const showActionsColumn = computed(() => !!(user.value || props.isOwnProfile))

const tableGridClass = computed(() => {
  if (props.analyticsMode && props.isOwnProfile) {
    return 'collectionTrackGrid-analytics-edit'
  }
  if (props.isOwnProfile) return 'collectionTrackGrid-edit'
  if (user.value) return 'collectionTrackGrid-with-actions'
  return 'collectionTrackGrid-loggedOut'
})

const openTrackComments = (track: any) => {
  const event = new CustomEvent('open-track-comments', {
    detail: {
      track: { id: track.id, title: track.title },
      collectionId: props.collectionId ?? null,
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

const isCurrentlyPlaying = (track: any) => {
  return currentTrack.value?.id === track.id && isPlaying.value
}

// Check if track is the current track (regardless of playing state)
const isCurrentTrack = (track: any): boolean => {
  if (!currentTrack.value || !track) return false
  // Use String() to ensure type-safe comparison (IDs might be numbers or strings)
  return String(currentTrack.value.id) === String(track.id)
}

const handlePlayClick = async (track: any, index: number) => {
  // If clicking the current track (regardless of play/pause state), just toggle play/pause
  // This ensures pausing/resuming doesn't restart the track
  if (isCurrentTrack(track)) {
    await togglePlayPause()
    return
  }
  
  // Only include non-hidden tracks in the queue
  const visibleTracks = props.tracks.filter(t => !t.hidden)
  const visibleIndex = visibleTracks.findIndex(t => t.id === track.id)
  
  setPlaybackContext({
    source: 'collection',
    collectionId: props.collectionId ?? null,
  })
  await loadQueue(visibleTracks, props.sourceId, visibleIndex >= 0 ? visibleIndex : 0)
}

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
  if (track.title) {
    const slug = track.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `${slug}-${track.id}`
  }
  return `track-${track.id}`
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
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

// Handle tracks removed from bulk actions drawer
const handleTracksRemoved = () => {
  // Clear selection and exit bulk mode
  bulkSelectionMode.value = false
  selectedTrackIds.value.clear()
  clickCount.value = 0
  showBulkActionsDrawer.value = false
  
  // Notify parent to refetch
  emit('tracks-removed')
}

// Handle tracks updated from bulk actions drawer
const handleTracksUpdated = () => {
  // Clear selection and exit bulk mode
  bulkSelectionMode.value = false
  selectedTrackIds.value.clear()
  clickCount.value = 0
  showBulkActionsDrawer.value = false
  
  // Notify parent to refetch
  emit('tracks-removed') // Reuse same event to trigger refetch
}

// Handle bulk actions drawer close
const handleBulkActionsClose = () => {
  showBulkActionsDrawer.value = false
}

// Filter collections to only show owner's collections for a track
// The parent component already filters collections by user_id, so we just return them
const getOwnerCollectionsForTrack = (track: any) => {
  return track.collections || []
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

const fetchUserCollections = async () => {
  if (!supabase || !user.value || !props.isOwnProfile) return

  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, slug')
      .eq('user_id', user.value.id)
      .order('name')

    if (error) throw error

    userCollections.value = (data || []).map((c: { id: number; name: string; slug: string }) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }))
  } catch (error) {
    console.error('Error fetching user collections:', error)
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
  if (!user.value || !props.isOwnProfile) return

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
    emit('tracks-removed')
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

// Remove track from collection
const handleRemoveFromCollection = async (trackId: number) => {
  if (!supabase || !user.value || !props.collectionId) return
  
  const toastId = showProcessing('Removing track from collection...')
  
  try {
    const { error: junctionError } = await supabase
      .from('collections_sounds')
      .delete()
      .eq('collection_id', props.collectionId)
      .eq('sound_id', trackId)

    if (junctionError) throw junctionError

    await supabase
      .from('track_comments')
      .delete()
      .eq('collection_id', props.collectionId)
      .eq('track_id', trackId)
    
    removeToast(toastId)
    showSuccess('Track removed from collection')
    emit('track-removed-from-collection', trackId)
    emit('tracks-removed') // Trigger refetch
  } catch (error) {
    removeToast(toastId)
    showError('Failed to remove track from collection')
    console.error('Error removing track from collection:', error)
  }
}
</script>

