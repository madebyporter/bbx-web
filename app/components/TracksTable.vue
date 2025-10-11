<template>
  <div class="py-2">
    <div v-if="loading" class="text-neutral-500">Loading tracks...</div>
    
    <div v-else-if="tracks.length === 0" class="text-neutral-500">
      {{ isOwnProfile ? 'No tracks uploaded yet.' : 'No tracks available.' }}
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-neutral-800">
          <tr class="text-left text-neutral-500">
            <th class="pb-2 pr-4 w-10"></th>
            <th class="pb-2 pr-4">Title</th>
            <th class="pb-2 pr-4">Artist</th>
            <th class="pb-2 pr-4">Version</th>
            <th class="pb-2 pr-4">Collection</th>
            <th class="pb-2 pr-4">Genre</th>
            <th class="pb-2 pr-4">BPM</th>
            <th class="pb-2 pr-4">Duration</th>
            <th v-if="isOwnProfile" class="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(track, index) in tracks" 
            :key="track.id"
            class="border-b border-neutral-800/50 hover:bg-neutral-800/30"
          >
            <td class="py-3 pr-4">
              <button
                @click="handlePlayClick(track, index)"
                class="text-neutral-400 hover:text-white transition-colors"
                :title="isCurrentlyPlaying(track) ? 'Pause' : 'Play'"
              >
                <svg v-if="isCurrentlyPlaying(track)" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </td>
            <td class="py-3 pr-4">{{ track.title || 'Untitled' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.artist || 'Unknown' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.version || 'v1.0' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.collection_names || '-' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.genre || '-' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.bpm || '-' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ formatDuration(track.duration) }}</td>
            <td v-if="isOwnProfile" class="py-3">
              <button
                @click="$emit('edit-track', track)"
                class="text-amber-400 hover:text-amber-300 text-xs"
                title="Edit track"
              >
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayer } from '~/composables/usePlayer'

interface Props {
  tracks: any[]
  sourceId: string
  isOwnProfile: boolean
  loading: boolean
}

const props = defineProps<Props>()
defineEmits<{
  'edit-track': [track: any]
}>()

const { currentTrack, isPlaying, loadQueue, togglePlayPause } = usePlayer()

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds === 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const isCurrentlyPlaying = (track: any): boolean => {
  return currentTrack.value?.id === track.id && isPlaying.value
}

const handlePlayClick = async (track: any, index: number) => {
  // If clicking the currently playing track, just toggle play/pause
  if (currentTrack.value?.id === track.id) {
    await togglePlayPause()
  } else {
    // Load the queue and start playing from this track
    await loadQueue(props.tracks, props.sourceId, index)
  }
}
</script>

