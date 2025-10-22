import { ref, computed, watch } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { shuffleUniqueGroups } from '~/utils/uniqueGroupShuffle'

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
  track_group_name?: string | null
  created_at?: string
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
  hasEverHadTrack: boolean
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
const hasEverHadTrack = ref(false)
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

  // Update queue without playing (for silent queue updates)
  const updateQueue = (tracks: Track[], sourceId: string) => {
    console.log('updateQueue: Updating queue silently', { tracksCount: tracks?.length, sourceId })
    if (!tracks || tracks.length === 0) {
      console.log('updateQueue: No tracks provided')
      return
    }

    // Store original queue
    originalQueue.value = [...tracks]
    queueSourceId.value = sourceId

    // Check if this is an "all music" queue (profile page)
    const isAllMusicQueue = sourceId?.startsWith('profile-')

    // Find the current track in the new queue
    const currentTrackId = currentTrack.value?.id
    let newIndex = 0
    
    if (currentTrackId) {
      const foundIndex = tracks.findIndex(t => t.id === currentTrackId)
      if (foundIndex !== -1) {
        newIndex = foundIndex
      } else {
        // Current track is no longer in the queue, reset to first track but don't play
        console.log('updateQueue: Current track not in new queue')
        currentIndex.value = 0
        currentTrack.value = tracks[0] || null
        queue.value = [...tracks]
        saveState()
        return
      }
    }

    // Apply shuffle if enabled
    if (isShuffled.value) {
      // For "all music" queues, first deduplicate by group name
      let tracksToShuffle = tracks
      if (isAllMusicQueue) {
        console.log('updateQueue: Applying unique group shuffle for all music queue')
        tracksToShuffle = shuffleUniqueGroups(tracks)
        console.log(`updateQueue: After deduplication: ${tracks.length} → ${tracksToShuffle.length} tracks`)
      }
      
      const trackToKeep = tracks[newIndex]
      
      // Ensure the track to keep is in the deduplicated list
      const trackInList = tracksToShuffle.find(t => t.id === trackToKeep.id)
      
      if (trackInList) {
        const otherTracks = tracksToShuffle.filter(t => t.id !== trackToKeep.id)
        queue.value = [trackInList, ...otherTracks]
      } else {
        // Track was deduplicated out, just use the deduplicated list
        queue.value = [...tracksToShuffle]
      }
      
      currentIndex.value = 0
    } else {
      queue.value = [...tracks]
      currentIndex.value = newIndex
    }

    console.log('updateQueue: Queue updated', { newQueueLength: queue.value.length, currentIndex: currentIndex.value })
    saveState()
  }

  // Load queue and optionally start playing
  const loadQueue = async (tracks: Track[], sourceId: string, autoPlayIndex: number = 0) => {
    console.log('loadQueue: Starting', { tracksCount: tracks?.length, sourceId, autoPlayIndex })
    if (!tracks || tracks.length === 0) {
      console.log('loadQueue: No tracks provided')
      return
    }

    // Mark that we've had a track loaded (for UI persistence)
    hasEverHadTrack.value = true

    // Store original queue
    originalQueue.value = [...tracks]
    queueSourceId.value = sourceId

    // Check if this is an "all music" queue (profile page)
    const isAllMusicQueue = sourceId?.startsWith('profile-')

    // Get the explicitly selected track (the one user clicked on)
    const explicitlySelectedTrack = tracks[autoPlayIndex]
    
    // Apply shuffle if enabled
    if (isShuffled.value) {
      // For "all music" queues, first deduplicate by group name
      let tracksToShuffle = tracks
      if (isAllMusicQueue) {
        console.log('loadQueue: Applying unique group shuffle for all music queue')
        tracksToShuffle = shuffleUniqueGroups(tracks)
        console.log(`loadQueue: After deduplication: ${tracks.length} → ${tracksToShuffle.length} tracks`)
      }
      
      // Remove the explicitly selected track from the shuffled list
      const otherTracks = tracksToShuffle.filter(t => t.id !== explicitlySelectedTrack.id)
      
      // Always place the explicitly selected track first, regardless of deduplication
      queue.value = [explicitlySelectedTrack, ...otherTracks]
      currentIndex.value = 0
      
      console.log(`loadQueue: Explicitly selected track [ID: ${explicitlySelectedTrack.id}] placed first`)
    } else {
      queue.value = [...tracks]
      currentIndex.value = autoPlayIndex
    }

    currentTrack.value = queue.value[currentIndex.value]
    console.log('loadQueue: Current track set', { title: currentTrack.value?.title, storage_path: currentTrack.value?.storage_path })
    
    // Log the queue order for debugging
    if (isShuffled.value && isAllMusicQueue) {
      console.log('📋 QUEUE ORDER (Smart Shuffle):')
      queue.value.forEach((track, idx) => {
        console.log(`  ${idx + 1}. "${track.title}" [ID: ${track.id}] [Group: ${track.track_group_name || 'none'}]`)
      })
    }
    
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
        console.log(`▶️ NOW PLAYING: "${currentTrack.value.title}" by ${currentTrack.value.artist} [ID: ${currentTrack.value.id}] [Group: ${currentTrack.value.track_group_name || 'none'}] [Version: ${currentTrack.value.version || 'N/A'}]`)
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
    
    // Check if we've reached the end of the queue
    if (nextIndex >= queue.value.length) {
      // Check if this is an "all music" queue with shuffle enabled
      const isAllMusicQueue = queueSourceId.value?.startsWith('profile-')
      
      if (isShuffled.value && isAllMusicQueue && originalQueue.value.length > 0) {
        console.log('🔄 End of queue reached - Re-shuffling!')
        
        // Re-shuffle the queue with smart shuffle
        const newShuffledQueue = shuffleUniqueGroups(originalQueue.value)
        queue.value = newShuffledQueue
        
        console.log('📋 NEW QUEUE ORDER (Re-shuffled):')
        queue.value.forEach((track, idx) => {
          if (idx < 10) { // Only show first 10 to avoid spam
            console.log(`  ${idx + 1}. "${track.title}" [ID: ${track.id}] [Group: ${track.track_group_name || 'none'}]`)
          }
        })
        if (queue.value.length > 10) {
          console.log(`  ... and ${queue.value.length - 10} more tracks`)
        }
        
        nextIndex = 0
      } else {
        // Normal loop behavior for non-shuffle or non-all-music queues
        nextIndex = 0
      }
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

    // Check if this is an "all music" queue (profile page)
    const isAllMusicQueue = queueSourceId.value?.startsWith('profile-')

    if (isShuffled.value) {
      // Shuffle the queue, keeping current track at current position
      const currentTrackData = currentTrack.value
      
      // For "all music" queues, first deduplicate by group name
      let tracksToShuffle = originalQueue.value
      if (isAllMusicQueue) {
        console.log('toggleShuffle: Applying unique group shuffle for all music queue')
        tracksToShuffle = shuffleUniqueGroups(originalQueue.value)
        console.log(`toggleShuffle: After deduplication: ${originalQueue.value.length} → ${tracksToShuffle.length} tracks`)
      }
      
      // Check if current track is in the deduplicated list
      if (currentTrackData) {
        const trackInList = tracksToShuffle.find(t => t.id === currentTrackData.id)
        
        if (trackInList) {
          // Current track is in list, keep it at position 0
          const otherTracks = tracksToShuffle.filter(t => t.id !== currentTrackData.id)
          queue.value = [trackInList, ...otherTracks]
          currentIndex.value = 0
        } else {
          // Current track was deduplicated out, use the deduplicated list without it
          queue.value = [...tracksToShuffle]
          currentIndex.value = 0
        }
      } else {
        queue.value = [...tracksToShuffle]
        currentIndex.value = 0
      }
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
        queueSourceId: queueSourceId.value,
        hasEverHadTrack: hasEverHadTrack.value
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
        hasEverHadTrack.value = state.hasEverHadTrack ?? false

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
    hasEverHadTrack.value = false
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
    hasEverHadTrack,
    audioElement,
    
    // Computed
    formattedCurrentTime,
    formattedDuration,
    progress,
    
    // Methods
    loadQueue,
    updateQueue,
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

