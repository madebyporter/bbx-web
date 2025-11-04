<template>
  <div class="py-2 w-full">
    <div v-if="loading" class="flex items-center justify-center p-8">
      <LoadingLogo />
    </div>

    <div v-else-if="tracks.length === 0" class="text-neutral-500 p-4">
      {{ isOwnProfile ? 'No tracks in this collection yet.' : 'No tracks available.' }}
    </div>

    <div class="w-fit md:w-full" v-else>
      <!-- Header -->
      <div :class="[
          'text-sm text-left text-neutral-500 border-b border-neutral-800 py-2 xl:sticky xl:top-20 bg-neutral-900 z-40',
          isOwnProfile ? 'collectionTrackGrid-edit' : (user ? 'collectionTrackGrid' : 'collectionTrackGrid-loggedOut')
        ]">
        <div></div>
        <div>Title</div>
        <div>Artist</div>
        <div>Version</div>
        <div v-if="user">Collection</div>
        <div>Genre</div>
        <div>BPM</div>
        <div>Duration</div>
        <div v-if="isOwnProfile && viewMode === 'all'">Visible</div>
        <div v-if="isOwnProfile">Status</div>
        <div v-if="isOwnProfile"></div>
      </div>

      <!-- Tracks -->
      <div v-for="(track, index) in tracks" :key="track.id" :data-track-id="track.id" :class="[
          'text-sm border-b border-neutral-800/50 py-3 transition-colors items-center',
          isOwnProfile ? 'collectionTrackGrid-edit' : (user ? 'collectionTrackGrid' : 'collectionTrackGrid-loggedOut'),
          { 'opacity-30': track.hidden && viewMode === 'all' },
          isCurrentlyPlaying(track) ? 'bg-neutral-800/70 lg:sticky lg:top-[117px] lg:backdrop-blur-sm' : 'hover:bg-neutral-800/30'
        ]">
        <div class="px-2 flex items-center justify-center">
          <button @click="handlePlayClick(track, index)"
            :class="['text-neutral-400 hover:text-white transition-colors cursor-pointer'] + (isCurrentlyPlaying(track) ? ' text-orange-400' : '')"
            :title="isCurrentlyPlaying(track) ? 'Pause' : 'Play'">
            <svg v-if="isCurrentlyPlaying(track)" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
        <div class="overflow-hidden truncate">
          <NuxtLink :to="`/u/${username}/t/${generateTrackSlug(track)}`"
            :class="['hover:text-white transition-colors hover:underline'] + (isCurrentlyPlaying(track) ? ' font-bold text-white' : '')">
            {{ track.title || 'Untitled' }}
          </NuxtLink>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.artist || 'Unknown' }}</div>
        <div class="text-neutral-400">{{ track.version || 'v1.0' }}</div>
        <div v-if="user" class="text-neutral-400 overflow-hidden">
          <template v-if="track.collections && track.collections.length > 0">
            <div class="flex flex-wrap gap-1">
              <NuxtLink 
                v-for="collection in track.collections" 
                :key="collection.slug"
                :to="`/u/${username}/c/${collection.slug}`" 
                class="inline-flex items-center px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-200 hover:text-white transition-colors"
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
        <div v-if="isOwnProfile && viewMode === 'all'" class="flex items-center justify-center">
          <button @click="$emit('toggle-hidden', track.id, track.hidden)"
            class="text-neutral-400 hover:text-white transition-colors cursor-pointer"
            :title="track.hidden ? 'Hidden from final (click to show)' : 'Visible in final (click to hide)'">
            <!-- Eye open (visible) -->
            <svg v-if="!track.hidden" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <!-- Eye slash (hidden) -->
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </button>
        </div>
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
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { usePlayer } from '~/composables/usePlayer'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import LoadingLogo from '~/components/LoadingLogo.vue'

const props = defineProps<{
  tracks: any[]
  sourceId: string
  isOwnProfile: boolean
  loading: boolean
  username: string
  viewMode: 'final' | 'all'
}>()

defineEmits(['edit-track', 'toggle-hidden'])

const { loadQueue, currentTrack, isPlaying } = usePlayer()
const { user } = useAuth()
const { supabase } = useSupabase()

const statuses = ref<Array<{ id: number; name: string }>>([])

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

const handlePlayClick = (track: any, index: number) => {
  // Only include non-hidden tracks in the queue
  const visibleTracks = props.tracks.filter(t => !t.hidden)
  const visibleIndex = visibleTracks.findIndex(t => t.id === track.id)
  
  loadQueue(visibleTracks, props.sourceId, visibleIndex >= 0 ? visibleIndex : 0)
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
</script>

