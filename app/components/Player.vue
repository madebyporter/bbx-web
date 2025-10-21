<template>
  <div v-if="hasEverHadTrack" ref="playerRef"
    class="w-full bg-neutral-900 border-t border-neutral-800 z-50 h-[57px] lg:h-fit"
    style="transform: translateY(100%)">
    <div class="w-full p-1 h-full">
      <div class="flex flex-row items-stretch gap-1 justify-between h-full">
        <!-- Left: Track Info -->
        <div class="flex items-center justify-start lg:bg-neutral-800/10 rounded-sm p-1 lg:min-w-48 grow lg:grow-0">
          <div v-if="currentTrack" class="text-xs lg:text-sm p-2 overflow-auto max-w-3xs">
            <div class="font-medium text-white truncate">{{ currentTrack.title || 'Untitled' }}</div>
            <div class="text-neutral-400 text-xs truncate">{{ currentTrack.artist || 'Unknown Artist' }}</div>
          </div>
        </div>

        <!-- Center: Controls + Seek Bar -->
        <div class="lg:bg-neutral-800/20 rounded-sm p-1 w-fit lg:w-full grow-0 lg:grow flex flex-col gap-1">
          <!-- Playback Controls -->
          <div class="flex items-center justify-center gap-1">
            <button @click="playPrevious" :disabled="!currentTrack"
              class="flex justify-center items-center h-10 lg:h-8 bg-neutral-800 rounded-sm p-2 px-1 text-neutral-400 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button @click="togglePlayPause" :disabled="!currentTrack"
              class="flex justify-center items-center w-10 h-10 lg:h-8 bg-white hover:bg-neutral-100 rounded-sm text-black disabled:opacity-30 disabled:cursor-not-allowed transition-transform cursor-pointer"
              title="Play/Pause">
              <svg v-if="isPlaying" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <svg v-else class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>

            <button @click="playNext" :disabled="!currentTrack"
              class="flex justify-center items-center h-10 lg:h-8 bg-neutral-800 rounded-sm p-2 px-1 text-neutral-400 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 18h2V6h-2zm-11 0l8.5-6L5 6z" />
              </svg>
            </button>
          </div>

          <!-- Seek Bar + Time -->
          <div class="hidden lg:flex items-center gap-2">
            <span class="text-xs text-neutral-400 w-10 text-right">{{ formattedCurrentTime }}</span>
            <div class="flex-1 relative h-1">
              <!-- Background track -->
              <div class="absolute inset-0 bg-neutral-700 rounded-full"></div>
              <!-- Progress bar -->
              <div class="absolute top-0 left-0 h-full bg-neutral-200 rounded-full pointer-events-none"
                :style="{ width: `${progress}%` }"></div>
              <!-- Interactive range input -->
              <input type="range" :value="currentTime" :max="duration || 100" @input="handleSeek"
                :disabled="!currentTrack" class="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed z-10 transition-transform [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-neutral-800
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-2 
                [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-115
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-2 [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:bg-yellow-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer
                [&::-moz-range-thumb]:shadow-lg" />
            </div>
            <span class="text-xs text-neutral-400 w-10">{{ formattedDuration }}</span>
          </div>
        </div>

        <!-- Right: Loop, Shuffle, Volume -->
        <div class="hidden lg:flex justify-end lg:bg-neutral-800/10 rounded-sm p-1 lg:min-w-48 max-w-3xs items-center gap-4">
          <button @click="toggleLoop" :class="[
              'text-neutral-400 hover:text-white transition-colors cursor-pointer',
              loopOne ? 'text-orange-400 hover:!text-orange-300' : ''
            ]" title="Loop One">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              <text v-if="loopOne" x="12" y="16" text-anchor="middle" font-size="8" fill="currentColor">1</text>
            </svg>
          </button>

          <button @click="toggleShuffle" :class="[
              'text-neutral-400 hover:text-white transition-colors cursor-pointer',
              isShuffled ? 'text-orange-400 hover:!text-orange-300' : ''
            ]" title="Shuffle">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>

          <button @click="toggleMute" :class="[
              'text-neutral-400 hover:text-white transition-colors cursor-pointer',
              isMuted ? 'text-orange-400 hover:!text-orange-300' : ''
            ]" title=" Mute/Unmute">
            <svg v-if="isMuted" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Hidden Audio Element - always rendered -->
  <audio ref="audioEl" @timeupdate="updateTime" @ended="handleTrackEnd" @loadedmetadata="updateDuration"
    @error="handleAudioError" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlayer } from '~/composables/usePlayer'
import gsap from 'gsap'

const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  isShuffled,
  loopOne,
  hasEverHadTrack,
  formattedCurrentTime,
  formattedDuration,
  progress,
  togglePlayPause,
  playNext,
  playPrevious,
  seekTo,
  toggleShuffle,
  toggleLoop,
  toggleMute,
  updateTime,
  updateDuration,
  handleTrackEnd,
  setAudioElement,
  loadState
} = usePlayer()

const playerRef = ref<HTMLDivElement | null>(null)
const audioEl = ref<HTMLAudioElement | null>(null)

// Set audio element reference
onMounted(async () => {
  console.log('Player.vue: onMounted, audioEl.value:', !!audioEl.value)
  if (audioEl.value) {
    setAudioElement(audioEl.value)
    await loadState()
  }
  
  // Don't auto-show player just because there's state in localStorage
  // Only show when user actively plays something in this session
})

// Clean up audio element on unmount
onUnmounted(() => {
  console.log('Player.vue: onUnmounted, cleaning up')
  setAudioElement(null)
})

// Track when a track is first loaded and animate player in/out
watch(currentTrack, async (newTrack) => {
  // Wait for DOM to update if this is the first track
  if (newTrack && !playerRef.value) {
    await nextTick()
  }

  // Now animate if playerRef is available
  if (!playerRef.value) return

  if (newTrack) {
    // Slide up
    gsap.to(playerRef.value, { 
      y: 0, 
      duration: 0.3, 
      ease: 'power2.out' 
    })
  } else {
    // Slide down
    gsap.to(playerRef.value, { 
      y: '100%', 
      duration: 0.3, 
      ease: 'power2.in' 
    })
  }
})

// Handle seek
const handleSeek = (event: Event) => {
  const target = event.target as HTMLInputElement
  seekTo(parseFloat(target.value))
}

// Handle audio errors
const handleAudioError = (event: Event) => {
  console.error('Audio playback error:', event)
  // Could implement auto-skip to next track on error
}
</script>

