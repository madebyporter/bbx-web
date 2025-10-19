<template>
  <div class="overflow-x-auto lg:overflow-x-visible w-full">
    <div v-if="loading" class="text-neutral-500 p-4">Loading tracks...</div>

    <div v-else-if="tracks.length === 0" class="text-neutral-500 p-4">
      {{ isOwnProfile ? 'No tracks uploaded yet.' : 'No tracks available.' }}
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
        <div>Genre</div>
        <div>BPM</div>
        <div>Duration</div>
        <div v-if="isOwnProfile"></div>
      </div>

      <!-- Tracks -->
      <div v-for="(track, index) in tracks" :key="track.id" :class="[
          'text-sm border-b border-neutral-800/50 hover:bg-neutral-800/30 py-3',
          isOwnProfile ? 'trackGrid-edit' : 'trackGrid'
        ]">
        <div class="px-2 flex items-center justify-center">
          <button @click="handlePlayClick(track, index)"
            class="text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
            class="hover:text-white transition-colors hover:underline">
            {{ track.title || 'Untitled' }}
          </NuxtLink>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.artist || 'Unknown' }}</div>
        <div class="text-neutral-400">{{ track.version || 'v1.0' }}</div>
        <div class="text-neutral-400 overflow-hidden truncate">
          <template v-if="track.collections && track.collections.length > 0">
            <NuxtLink v-for="(collection, idx) in track.collections" :key="collection.slug"
              :to="`/u/${username}/c/${collection.slug}`" class="hover:text-white hover:underline transition-colors">{{
              collection.name }}<span v-if="idx < track.collections.length - 1">, </span></NuxtLink>
          </template>
          <template v-else>-</template>
        </div>
        <div class="text-neutral-400 overflow-hidden truncate">{{ track.genre || '-' }}</div>
        <div class="text-neutral-400">{{ track.bpm || '-' }}</div>
        <div class="text-neutral-400">{{ formatDuration(track.duration) }}</div>
        <div v-if="isOwnProfile">
          <button @click="$emit('edit-track', track)" class="text-amber-400 hover:text-amber-300 text-xs cursor-pointer"
            title="Edit track">
            Edit
          </button>
        </div>
      </div>
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
  username: string
}

const props = defineProps<Props>()
defineEmits<{
  'edit-track': [track: any]
}>()

const { currentTrack, isPlaying, loadQueue, togglePlayPause } = usePlayer()

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

