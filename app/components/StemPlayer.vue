<template>
  <div class="flex flex-col gap-0 border-b border-neutral-800 bg-neutral-900/50">
    <!-- Collapsed State: Play All Button / Loading -->
    <div v-if="!isExpanded" class="p-4">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-4">
        <LoadingLogo />
      </div>
      
      <!-- Play All Button -->
      <button v-else @click="handlePlayAll" :disabled="!isLoaded"
        class="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 rounded-sm text-black text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Play all tracks simultaneously">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        Play All Stems
      </button>
    </div>

    <!-- Expanded State: Full Controls -->
    <div v-else ref="expandedRef" class="overflow-hidden">
      <!-- Master Controls -->
      <div class="p-4 flex items-center gap-4">
      <!-- Play/Pause -->
      <button @click="togglePlayPause" :disabled="!isLoaded"
        class="flex justify-center items-center w-10 h-10 bg-white hover:bg-neutral-100 rounded-sm text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        :title="isPlaying ? 'Pause All' : 'Play All'">
        <svg v-if="isPlaying" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
        <svg v-else class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <!-- Timeline -->
      <div class="flex-1 flex items-center gap-2">
        <span class="text-xs text-neutral-400 w-10 text-right">{{ formattedCurrentTime }}</span>
        <div class="flex-1 relative h-1">
          <!-- Background track -->
          <div class="absolute inset-0 bg-neutral-700 rounded-full"></div>
          <!-- Progress bar -->
          <div class="absolute top-0 left-0 h-full bg-neutral-200 rounded-full pointer-events-none"
            :style="{ width: `${progress}%` }"></div>
          <!-- Interactive range input -->
          <input type="range" :value="currentTime" :max="duration || 100" @input="handleSeek"
            :disabled="!isLoaded" class="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed z-10 transition-transform [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-neutral-800
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-2 
            [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-115
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20
            [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-2 [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-yellow-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:shadow-lg" />
        </div>
        <span class="text-xs text-neutral-400 w-10">{{ formattedDuration }}</span>
      </div>

      <!-- Master Volume -->
      <div class="hidden lg:flex items-center gap-2">
        <span class="text-xs text-neutral-400">Master</span>
        <input type="range" :value="masterVolume" min="0" max="1" step="0.01" @input="handleMasterVolume"
          class="w-20 h-1 appearance-none bg-neutral-700 rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
          [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer" />
        <span class="text-xs text-neutral-400 w-8">{{ Math.round(masterVolume * 100) }}%</span>
      </div>
      </div>

      <!-- Info Text -->
      <div class="p-3 border-t border-neutral-800/50 text-center text-sm text-neutral-500">
        Use Mute/Solo buttons in track list below to control individual stems
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStemPlayer } from '~/composables/useStemPlayer'
import LoadingLogo from '~/components/LoadingLogo.vue'
import gsap from 'gsap'

interface Props {
  tracks: any[]
}

const props = defineProps<Props>()

const {
  stemTracks,
  isPlaying,
  currentTime,
  duration,
  masterVolume,
  formattedCurrentTime,
  formattedDuration,
  progress,
  loadTracks,
  play,
  togglePlayPause,
  seekTo,
  setMasterVolume,
  cleanup
} = useStemPlayer()

const loading = ref(false)
const isLoaded = ref(false)
const isExpanded = ref(false)
const expandedRef = ref<HTMLDivElement | null>(null)

// Load tracks when component mounts or props change
watch(() => props.tracks, async (newTracks) => {
  if (newTracks && newTracks.length > 0) {
    loading.value = true
    isLoaded.value = false
    
    try {
      await loadTracks(newTracks)
      isLoaded.value = true
    } catch (err) {
      console.error('Error loading stem tracks:', err)
    } finally {
      loading.value = false
    }
  }
}, { immediate: true })

// Handle Play All - expand and start playing
const handlePlayAll = async () => {
  if (!isLoaded.value) return
  
  // Expand the panel
  isExpanded.value = true
  
  // Wait for DOM update
  await nextTick()
  
  // Animate expansion
  if (expandedRef.value) {
    gsap.from(expandedRef.value, {
      height: 0,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out'
    })
  }
  
  // Start playing
  play()
}

// Handle seek
const handleSeek = (event: Event) => {
  const target = event.target as HTMLInputElement
  seekTo(parseFloat(target.value))
}

// Handle master volume
const handleMasterVolume = (event: Event) => {
  const target = event.target as HTMLInputElement
  setMasterVolume(parseFloat(target.value))
}

// Cleanup on unmount
onUnmounted(() => {
  cleanup()
})
</script>

