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
      <!-- Header -->
      <div :class="[
          'text-sm text-left text-neutral-500 border-b border-neutral-800 py-2 lg:sticky lg:top-20 bg-neutral-900 z-40',
          isOwnProfile ? 'trackGrid-edit' : 'trackGrid'
        ]">
        <div></div>
        <div>Title</div>
        <div>Artist</div>
        <div>Version</div>
        <div>Collection</div>
        <div>Status</div>
        <div>Genre</div>
        <div>BPM</div>
        <div>Duration</div>
        <div v-if="isOwnProfile"></div>
      </div>

      <!-- Tracks -->
      <div v-for="(track, index) in tracks" :key="track.id" :data-track-id="track.id" :class="[
          'text-sm border-b border-neutral-800/50 py-3 transition-colors items-center',
          isOwnProfile ? 'trackGrid-edit' : 'trackGrid', isCurrentlyPlaying(track) ? 'bg-neutral-800/70 lg:sticky lg:top-[117px] lg:backdrop-blur-sm' : 'hover:bg-neutral-800/30'
        ]">
        <div class="px-2 flex items-center justify-center gap-1">
          <!-- Stem Player Mode: Show Mute/Solo -->
          <template v-if="isStemPlayerActive">
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
        <div class="overflow-hidden truncate">
          <NuxtLink :to="`/u/${username}/t/${generateTrackSlug(track)}`"
            :class="['hover:text-white transition-colors hover:underline'] + (isCurrentlyPlaying(track) ? ' font-bold text-white' : '')">
            {{ track.title || 'Untitled' }}
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
                class="inline-flex items-center px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-200 hover:text-white transition-colors"
              >
                {{ collection.name }}
              </NuxtLink>
            </div>
          </template>
          <template v-else>-</template>
        </div>
        <div class="text-neutral-400 overflow-hidden">
          <template v-if="track.track_status">
            <span class="inline-flex items-center px-2 py-0.5 bg-amber-900/30 border border-amber-700/50 rounded text-xs text-amber-200">
              {{ track.track_status.name }}
            </span>
          </template>
          <template v-else>-</template>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.genre || '-' }}</div>
        <div class="text-neutral-400">{{ track.bpm || '-' }}</div>
        <div class="text-neutral-400">{{ formatDuration(track.duration) }}</div>
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
import { onMounted, onUnmounted } from 'vue'
import { usePlayer } from '~/composables/usePlayer'
import { useStemPlayer } from '~/composables/useStemPlayer'
import LoadingLogo from '~/components/LoadingLogo.vue'

interface Props {
  tracks: any[]
  sourceId: string
  isOwnProfile: boolean
  loading: boolean
  username: string
}

const props = defineProps<Props>()
defineEmits<{
  'edit-track': [track: any]
}>()

const { currentTrack, isPlaying, loadQueue, togglePlayPause } = usePlayer()
const { isStemPlayerActive, stemTracks, toggleMute, toggleSolo } = useStemPlayer()

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

onMounted(() => {
  window.addEventListener('scroll-to-track', handleScrollToTrack as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('scroll-to-track', handleScrollToTrack as EventListener)
})

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
</script>

