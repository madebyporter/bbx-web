import { ref, computed, watch } from 'vue'
import { useSupabase } from '~/utils/supabase'

export interface Track {
  id: number
  user_id: string
  title: string
  artist: string
  storage_path: string
  duration: number
  version?: string
  genre?: string
  mood?: string
  bpm?: number | null
  year?: number | null
  collection_names?: string
}

interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  currentIndex: number
  currentTime: number
  volume: number
  isMuted: boolean
  isShuffled: boolean
  loopOne: boolean
  queueSourceId: string | null
}

// Global state - shared across all instances
const currentTrack = ref<Track | null>(null)
const queue = ref<Track[]>([])
const originalQueue = ref<Track[]>([]) // Store original order for un-shuffling
const queueSourceId = ref<string | null>(null)
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const isShuffled = ref(false)
const loopOne = ref(false)
const audioElement = ref<HTMLAudioElement | null>(null)
const signedUrlCache = ref<Map<string, { url: string; expiry: number }>>(new Map())

const STORAGE_KEY = 'player_state'

export function usePlayer() {
  const { supabase } = useSupabase()

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get signed URL from Supabase Storage
  const getSignedUrl = async (filepath: string): Promise<string | null> => {
    // Check cache first
    const cached = signedUrlCache.value.get(filepath)
    if (cached && cached.expiry > Date.now()) {
      return cached.url
    }

    try {
      const { data, error } = await supabase.storage
        .from('sounds')
        .createSignedUrl(filepath, 3600) // 1 hour expiry

      if (error) {
        console.error('Error getting signed URL:', error)
        return null
      }

      // Cache the URL with expiry time (55 minutes to be safe)
      signedUrlCache.value.set(filepath, {
        url: data.signedUrl,
        expiry: Date.now() + (55 * 60 * 1000)
      })

      return data.signedUrl
    } catch (err) {
      console.error('Error getting signed URL:', err)
      return null
    }
  }

  // Shuffle array helper
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Load queue and optionally start playing
  const loadQueue = async (tracks: Track[], sourceId: string, autoPlayIndex: number = 0) => {
    console.log('loadQueue: Starting', { tracksCount: tracks?.length, sourceId, autoPlayIndex })
    if (!tracks || tracks.length === 0) {
      console.log('loadQueue: No tracks provided')
      return
    }

    // Store original queue
    originalQueue.value = [...tracks]
    queueSourceId.value = sourceId

    // Apply shuffle if enabled
    if (isShuffled.value) {
      // Shuffle the queue but ensure the track at autoPlayIndex is first
      const trackToPlay = tracks[autoPlayIndex]
      const otherTracks = tracks.filter((_, i) => i !== autoPlayIndex)
      const shuffledOthers = shuffleArray(otherTracks)
      queue.value = [trackToPlay, ...shuffledOthers]
      currentIndex.value = 0
    } else {
      queue.value = [...tracks]
      currentIndex.value = autoPlayIndex
    }

    currentTrack.value = queue.value[currentIndex.value]
    console.log('loadQueue: Current track set', { title: currentTrack.value?.title, storage_path: currentTrack.value?.storage_path })
    
    // Load the track
    if (currentTrack.value) {
      console.log('loadQueue: Getting signed URL for', currentTrack.value.storage_path)
      const url = await getSignedUrl(currentTrack.value.storage_path)
      console.log('loadQueue: Got signed URL', { url: url ? 'success' : 'null' })
      if (url && audioElement.value) {
        console.log('loadQueue: Setting audio src and loading')
        audioElement.value.src = url
        audioElement.value.load()
        console.log('loadQueue: Calling play()')
        await play()
      } else {
        console.error('loadQueue: Failed - url or audioElement missing', { url: !!url, audioElement: !!audioElement.value })
      }
    }

    saveState()
  }

  // Play
  const play = async () => {
    if (audioElement.value && currentTrack.value) {
      try {
        await audioElement.value.play()
        isPlaying.value = true
        saveState()
      } catch (err) {
        console.error('Error playing audio:', err)
      }
    }
  }

  // Pause
  const pause = () => {
    if (audioElement.value) {
      audioElement.value.pause()
      isPlaying.value = false
      saveState()
    }
  }

  // Toggle play/pause
  const togglePlayPause = async () => {
    if (isPlaying.value) {
      pause()
    } else {
      await play()
    }
  }

  // Play track at specific index
  const playTrackAtIndex = async (index: number) => {
    if (index < 0 || index >= queue.value.length) return

    currentIndex.value = index
    currentTrack.value = queue.value[index]
    currentTime.value = 0

    if (currentTrack.value) {
      const url = await getSignedUrl(currentTrack.value.storage_path)
      if (url && audioElement.value) {
        audioElement.value.src = url
        audioElement.value.load()
        await play()
      }
    }

    saveState()
  }

  // Play next track
  const playNext = async () => {
    if (queue.value.length === 0) return

    let nextIndex = currentIndex.value + 1
    if (nextIndex >= queue.value.length) {
      nextIndex = 0 // Loop back to start
    }

    await playTrackAtIndex(nextIndex)
  }

  // Play previous track
  const playPrevious = async () => {
    if (queue.value.length === 0) return

    // If more than 3 seconds into the song, restart it
    if (currentTime.value > 3) {
      seekTo(0)
      return
    }

    let prevIndex = currentIndex.value - 1
    if (prevIndex < 0) {
      prevIndex = queue.value.length - 1 // Loop to end
    }

    await playTrackAtIndex(prevIndex)
  }

  // Seek to specific time
  const seekTo = (time: number) => {
    if (audioElement.value) {
      audioElement.value.currentTime = time
      currentTime.value = time
      saveState()
    }
  }

  // Toggle shuffle
  const toggleShuffle = () => {
    isShuffled.value = !isShuffled.value

    if (isShuffled.value) {
      // Shuffle the queue, keeping current track at current position
      const currentTrackData = currentTrack.value
      const otherTracks = queue.value.filter(t => t.id !== currentTrackData?.id)
      const shuffledOthers = shuffleArray(otherTracks)
      
      // Rebuild queue with current track at current index
      const newQueue = [...shuffledOthers]
      if (currentTrackData) {
        newQueue.splice(currentIndex.value, 0, currentTrackData)
      }
      queue.value = newQueue
    } else {
      // Restore original order, find current track's original position
      const currentTrackData = currentTrack.value
      queue.value = [...originalQueue.value]
      
      if (currentTrackData) {
        const newIndex = queue.value.findIndex(t => t.id === currentTrackData.id)
        if (newIndex !== -1) {
          currentIndex.value = newIndex
        }
      }
    }

    saveState()
  }

  // Toggle loop one
  const toggleLoop = () => {
    loopOne.value = !loopOne.value
    saveState()
  }

  // Set volume
  const setVolume = (vol: number) => {
    volume.value = Math.max(0, Math.min(1, vol))
    if (audioElement.value) {
      audioElement.value.volume = volume.value
    }
    if (volume.value > 0) {
      isMuted.value = false
    }
    saveState()
  }

  // Toggle mute
  const toggleMute = () => {
    isMuted.value = !isMuted.value
    if (audioElement.value) {
      audioElement.value.muted = isMuted.value
    }
    saveState()
  }

  // Add track to queue
  const addTrackToQueue = (track: Track) => {
    queue.value.push(track)
    originalQueue.value.push(track)
    saveState()
  }

  // Handle track end
  const handleTrackEnd = async () => {
    if (loopOne.value) {
      // Loop current track
      seekTo(0)
      await play()
    } else {
      // Play next track
      await playNext()
    }
  }

  // Save state to localStorage
  const saveState = () => {
    try {
      const state: PlayerState = {
        currentTrack: currentTrack.value,
        queue: queue.value,
        currentIndex: currentIndex.value,
        currentTime: currentTime.value,
        volume: volume.value,
        isMuted: isMuted.value,
        isShuffled: isShuffled.value,
        loopOne: loopOne.value,
        queueSourceId: queueSourceId.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.error('Error saving player state:', err)
    }
  }

  // Load state from localStorage
  const loadState = async () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const state: PlayerState = JSON.parse(saved)
        
        currentTrack.value = state.currentTrack
        queue.value = state.queue || []
        originalQueue.value = [...queue.value]
        currentIndex.value = state.currentIndex || 0
        volume.value = state.volume ?? 1
        isMuted.value = state.isMuted ?? false
        isShuffled.value = state.isShuffled ?? false
        loopOne.value = state.loopOne ?? false
        queueSourceId.value = state.queueSourceId || null

        // Don't auto-play on load, but load the track
        if (currentTrack.value && audioElement.value) {
          const url = await getSignedUrl(currentTrack.value.storage_path)
          if (url) {
            audioElement.value.src = url
            audioElement.value.load()
            audioElement.value.currentTime = state.currentTime || 0
            audioElement.value.volume = volume.value
            audioElement.value.muted = isMuted.value
          }
        }
      }
    } catch (err) {
      console.error('Error loading player state:', err)
    }
  }

  // Clear all state
  const clearPlayer = () => {
    pause()
    currentTrack.value = null
    queue.value = []
    originalQueue.value = []
    queueSourceId.value = null
    currentIndex.value = 0
    currentTime.value = 0
    duration.value = 0
    localStorage.removeItem(STORAGE_KEY)
  }

  // Update current time
  const updateTime = () => {
    if (audioElement.value) {
      currentTime.value = audioElement.value.currentTime
    }
  }

  // Update duration
  const updateDuration = () => {
    if (audioElement.value) {
      duration.value = audioElement.value.duration
    }
  }

  // Set audio element (called by Player component)
  const setAudioElement = (el: HTMLAudioElement | null) => {
    console.log('setAudioElement: Setting audio element', { el: !!el })
    audioElement.value = el
    if (el) {
      el.volume = volume.value
      if (isMuted.value) {
        el.muted = true
      }
    }
  }

  // Computed values
  const formattedCurrentTime = computed(() => formatTime(currentTime.value))
  const formattedDuration = computed(() => formatTime(duration.value))
  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  return {
    // State
    currentTrack,
    queue,
    queueSourceId,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffled,
    loopOne,
    audioElement,
    
    // Computed
    formattedCurrentTime,
    formattedDuration,
    progress,
    
    // Methods
    loadQueue,
    play,
    pause,
    togglePlayPause,
    playTrackAtIndex,
    playNext,
    playPrevious,
    seekTo,
    toggleShuffle,
    toggleLoop,
    setVolume,
    toggleMute,
    addTrackToQueue,
    handleTrackEnd,
    updateTime,
    updateDuration,
    setAudioElement,
    loadState,
    saveState,
    clearPlayer
  }
}

