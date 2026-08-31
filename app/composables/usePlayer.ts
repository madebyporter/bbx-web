import { ref, computed, watch } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { shuffleUniqueGroups } from '~/utils/uniqueGroupShuffle'
import {
  beginListenSession,
  endListenSession,
  tickListenSession,
  getPlaybackContext,
} from '~/composables/useTrackAnalytics'
import { useAuth } from '~/composables/useAuth'
import { useAnalytics } from '~/composables/useAnalytics'
import type { Track } from '~/types/track'
import { getAudioCacheKey, getPlaybackUrl } from '~/utils/trackAudioStorage'

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
/** Survives Player remounts so the chrome does not re-animate on navigation */
const playerHasEntered = ref(false)
const playerStateLoaded = ref(false)
const audioElement = ref<HTMLAudioElement | null>(null)
/** Cache key (`provider:storage_path`) of the audio currently loaded on the <audio> element */
const loadedAudioCacheKey = ref<string | null>(null)
const signedUrlCache = ref<Map<string, { url: string; expiry: number }>>(new Map())
const preloadedUrls = ref<Set<string>>(new Set())
const loopCheckAnimationFrame = ref<number | null>(null)

const STORAGE_KEY = 'player_state'
const CHROME_COOKIE = 'bbx_player_chrome'

function readStoredPlayerFlags(): { hasEverHadTrack: boolean; hasTrack: boolean } {
  if (!import.meta.client) {
    return { hasEverHadTrack: false, hasTrack: false }
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { hasEverHadTrack: false, hasTrack: false }
    const state = JSON.parse(saved) as Partial<PlayerState>
    return {
      hasEverHadTrack: !!state.hasEverHadTrack,
      hasTrack: !!state.currentTrack && !!state.hasEverHadTrack,
    }
  } catch {
    return { hasEverHadTrack: false, hasTrack: false }
  }
}

// Client module init: hydrate visibility before first paint (avoids async loadState flash)
if (import.meta.client) {
  const storedFlags = readStoredPlayerFlags()
  hasEverHadTrack.value = storedFlags.hasEverHadTrack
  playerHasEntered.value = storedFlags.hasTrack
  // Keep SSR cookie in sync so the next full load reserves player height
  if (storedFlags.hasEverHadTrack) {
    try {
      document.cookie = `${CHROME_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    } catch {
      // ignore
    }
  }
}

export function usePlayer() {
  const { supabase } = useSupabase()
  // Cookie lets SSR reserve player height so the sidebar account block does not jump on hydrate
  const playerChromeCookie = useCookie<string | null>(CHROME_COOKIE, {
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  const syncPlayerChromeCookie = () => {
    // Only write a real value; clearing via null can emit Set-Cookie: undefined on SSR
    if (hasEverHadTrack.value) {
      playerChromeCookie.value = '1'
    } else if (playerChromeCookie.value != null) {
      playerChromeCookie.value = null
    }
  }

  // Expose cookie for Player chrome visibility during SSR (do not mutate shared module flags on server)
  const shouldReservePlayerChrome = computed(
    () => hasEverHadTrack.value || playerChromeCookie.value === '1'
  )

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get playback URL from Supabase Storage or R2 with long-term caching
  const getTrackPlaybackUrl = async (track: Pick<Track, 'id' | 'storage_path' | 'storage_provider'>): Promise<string | null> => {
    const cacheKey = getAudioCacheKey(track)
    const cached = signedUrlCache.value.get(cacheKey)
    if (cached && cached.expiry > Date.now()) {
      return cached.url
    }

    try {
      const url = await getPlaybackUrl(track, supabase)
      if (!url) return null

      signedUrlCache.value.set(cacheKey, {
        url,
        expiry: Date.now() + (23 * 60 * 60 * 1000),
      })

      return url
    } catch (err) {
      console.error('Error getting playback URL:', err)
      return null
    }
  }

  /** True when this track's audio file is what is currently loaded on the <audio> element */
  const isLoadedAudio = (track: Pick<Track, 'id' | 'storage_path' | 'storage_provider'> | null | undefined): boolean => {
    if (!track || !currentTrack.value) return false
    if (String(currentTrack.value.id) !== String(track.id)) return false
    if (!loadedAudioCacheKey.value) return false
    return loadedAudioCacheKey.value === getAudioCacheKey(track)
  }

  const isSameSongVersion = (a: Track | null | undefined, b: Track | null | undefined): boolean => {
    if (!a || !b) return false
    if (String(a.id) === String(b.id)) return true
    const groupA = a.track_group_name?.trim()
    const groupB = b.track_group_name?.trim()
    return !!groupA && !!groupB && groupA === groupB
  }

  const applyAudioSrc = async (
    track: Track,
    options: { seekToZero?: boolean } = {},
  ): Promise<boolean> => {
    const { seekToZero = true } = options
    if (!audioElement.value) return false

    const url = await getTrackPlaybackUrl(track)
    if (!url) return false

    audioElement.value.src = url
    audioElement.value.loop = false
    audioElement.value.preload = 'auto'
    audioElement.value.load()
    loadedAudioCacheKey.value = getAudioCacheKey(track)

    if (seekToZero) {
      currentTime.value = 0
      audioElement.value.currentTime = 0
    }

    return true
  }

  const replaceQueueSlot = (oldTrackId: number | string | undefined, newTrack: Track) => {
    if (oldTrackId == null) return

    const queueIndex = queue.value.findIndex(t => String(t.id) === String(oldTrackId))
    if (queueIndex !== -1) {
      queue.value[queueIndex] = { ...queue.value[queueIndex], ...newTrack }
      currentIndex.value = queueIndex
    } else {
      // Old version not in queue — place new track at current index or append
      if (queue.value.length === 0) {
        queue.value = [newTrack]
        currentIndex.value = 0
      } else {
        queue.value[currentIndex.value] = newTrack
      }
    }

    const originalIndex = originalQueue.value.findIndex(t => String(t.id) === String(oldTrackId))
    if (originalIndex !== -1) {
      originalQueue.value[originalIndex] = { ...originalQueue.value[originalIndex], ...newTrack }
    } else if (originalQueue.value.length === 0) {
      originalQueue.value = [newTrack]
    }
  }

  // Preload next track in queue for seamless playback
  const preloadNextTrack = async () => {
    if (queue.value.length === 0) return

    let nextIndex = currentIndex.value + 1
    if (nextIndex >= queue.value.length) {
      nextIndex = 0 // Loop to start
    }

    const nextTrack = queue.value[nextIndex]
    if (nextTrack && !preloadedUrls.value.has(getAudioCacheKey(nextTrack))) {
      const url = await getTrackPlaybackUrl(nextTrack)
      if (url && typeof window !== 'undefined') {
        // Use link preload for audio
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.as = 'audio'
        link.href = url
        document.head.appendChild(link)
        preloadedUrls.value.add(getAudioCacheKey(nextTrack))
      }
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
    if (!tracks || tracks.length === 0) {
      return
    }

    // Store original queue
    originalQueue.value = [...tracks]
    queueSourceId.value = sourceId

    // Find the current track in the new queue
    const current = currentTrack.value
    const currentTrackId = current?.id
    let newIndex = 0
    let replacementTrack: Track | null = null
    
    if (currentTrackId) {
      const foundIndex = tracks.findIndex(t => t.id === currentTrackId)
      if (foundIndex !== -1) {
        newIndex = foundIndex
      } else {
        // Current id gone — prefer same track_group_name (new version), else first track
        const groupName = current?.track_group_name?.trim()
        const groupIndex = groupName
          ? tracks.findIndex(t => t.track_group_name?.trim() === groupName)
          : -1

        if (groupIndex !== -1) {
          replacementTrack = tracks[groupIndex] ?? null
          newIndex = groupIndex
        } else {
          currentIndex.value = 0
          currentTrack.value = tracks[0] || null
          queue.value = [...tracks]
          // Metadata changed but audio src is stale — reload if we still have a track
          if (currentTrack.value && audioElement.value) {
            void (async () => {
              const wasPlaying = isPlaying.value
              await endListenSession()
              const loaded = await applyAudioSrc(currentTrack.value!, { seekToZero: true })
              if (loaded && wasPlaying) {
                await play()
              } else if (!loaded) {
                isPlaying.value = false
              }
              saveState()
            })()
          } else {
            saveState()
          }
          return
        }
      }
    }

    // Apply shuffle if enabled
    if (isShuffled.value) {
      const tracksToShuffle = shuffleUniqueGroups(tracks)
      
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

    // New version of the same song replaced the old id — reload audio from 0
    if (replacementTrack) {
      void replaceCurrentVersion(replacementTrack)
      return
    }

    saveState()
  }

  // Load queue and optionally start playing
  const loadQueue = async (tracks: Track[], sourceId: string, autoPlayIndex: number = 0) => {
    if (!tracks || tracks.length === 0) {
      return
    }

    await endListenSession()

    // Mark that we've had a track loaded (for UI persistence)
    hasEverHadTrack.value = true
    syncPlayerChromeCookie()

    // Store original queue
    originalQueue.value = [...tracks]
    queueSourceId.value = sourceId

    // Get the explicitly selected track (the one user clicked on)
    const explicitlySelectedTrack = tracks[autoPlayIndex]
    
    // Apply shuffle if enabled
    if (isShuffled.value) {
      const tracksToShuffle = shuffleUniqueGroups(tracks)
      
      // Remove the explicitly selected track from the shuffled list
      const otherTracks = tracksToShuffle.filter(t => t.id !== explicitlySelectedTrack.id)
      
      // Always place the explicitly selected track first, regardless of deduplication
      queue.value = [explicitlySelectedTrack, ...otherTracks]
      currentIndex.value = 0
      
    } else {
      queue.value = [...tracks]
      currentIndex.value = autoPlayIndex
    }

    currentTrack.value = queue.value[currentIndex.value]
    
    // Log the queue order for debugging
    if (isShuffled.value) {
      queue.value.forEach((track, idx) => {
      })
    }
    
    // Load the track
    if (currentTrack.value) {
      currentTime.value = 0
      const loaded = await applyAudioSrc(currentTrack.value, { seekToZero: true })
      if (loaded) {
        // Wait a bit for buffering before playing for smoother loop
        if (loopOne.value) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        await play()
      } else {
        console.error('loadQueue: Failed - url or audioElement missing', { audioElement: !!audioElement.value })
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
        beginListenSession(currentTrack.value)

        const track = currentTrack.value
        const { user } = useAuth()
        const { capture } = useAnalytics()
        const ctx = getPlaybackContext()
        capture('track_played', {
          track_id: track.id,
          owner_id: track.user_id,
          is_own_track: user.value?.id === track.user_id,
          source: ctx.source,
          collection_id: ctx.collectionId,
        })
        // Start frame-perfect loop check if loopOne is enabled
        if (loopOne.value) {
          startLoopCheck()
        }
        // Preload next track for seamless playback
        preloadNextTrack()
        saveState()
      } catch (err) {
        console.error('Error playing audio:', err)
      }
    }
  }

  // Pause
  const pause = async () => {
    if (audioElement.value) {
      await endListenSession()
      audioElement.value.pause()
      isPlaying.value = false
      // Stop frame-perfect loop check
      stopLoopCheck()
      saveState()
    }
  }

  // Toggle play/pause
  const togglePlayPause = async () => {
    if (isPlaying.value) {
      await pause()
    } else {
      await play()
    }
  }

  /**
   * Swap the currently loaded song to a new version (same id or same track_group_name)
   * and restart from the beginning.
   */
  const replaceCurrentVersion = async (newTrack: Track): Promise<boolean> => {
    if (!newTrack || !currentTrack.value) return false
    if (!isSameSongVersion(currentTrack.value, newTrack)) return false

    // Same file already loaded — nothing to swap
    if (loadedAudioCacheKey.value === getAudioCacheKey(newTrack) &&
        String(currentTrack.value.id) === String(newTrack.id)) {
      return true
    }

    const oldTrack = currentTrack.value
    const oldCacheKey = getAudioCacheKey(oldTrack)
    if (oldCacheKey) {
      signedUrlCache.value.delete(oldCacheKey)
    }

    const wasPlaying = isPlaying.value
    await endListenSession()

    replaceQueueSlot(oldTrack.id, newTrack)
    currentTrack.value = { ...oldTrack, ...newTrack }
    hasEverHadTrack.value = true
    syncPlayerChromeCookie()

    const loaded = await applyAudioSrc(currentTrack.value, { seekToZero: true })
    if (loaded && wasPlaying) {
      await play()
    } else if (!loaded) {
      isPlaying.value = false
    }

    saveState()
    return loaded
  }

  // Play track at specific index
  const playTrackAtIndex = async (index: number) => {
    if (index < 0 || index >= queue.value.length) return

    await endListenSession()

    currentIndex.value = index
    currentTrack.value = queue.value[index]
    currentTime.value = 0

    if (currentTrack.value) {
      const loaded = await applyAudioSrc(currentTrack.value, { seekToZero: true })
      if (loaded) {
        // Wait a bit for buffering before playing for smoother loop
        if (loopOne.value) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
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
      if (isShuffled.value && originalQueue.value.length > 0) {
        
        // Re-shuffle the queue with smart shuffle
        const newShuffledQueue = shuffleUniqueGroups(originalQueue.value)
        queue.value = newShuffledQueue
        
        queue.value.forEach((track, idx) => {
          if (idx < 10) { // Only show first 10 to avoid spam
          }
        })
        if (queue.value.length > 10) {
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

    if (isShuffled.value) {
      // Shuffle the queue, keeping current track at current position
      const currentTrackData = currentTrack.value
      const tracksToShuffle = shuffleUniqueGroups(originalQueue.value)
      
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
    // Don't use native loop property - we handle looping manually with requestAnimationFrame
    // for frame-perfect seamless control, especially for short beats
    if (audioElement.value) {
      audioElement.value.loop = false // Always false - we handle looping manually
    }
    
    // Start/stop frame-perfect loop check based on loop state
    if (loopOne.value && isPlaying.value) {
      startLoopCheck()
    } else {
      stopLoopCheck()
    }
    
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
    await endListenSession()
    // If loopOne is enabled, checkLoopFrame should have already looped seamlessly
    // This is just a backup in case the ended event fires
    if (loopOne.value && audioElement.value) {
      // Backup loop (checkLoopFrame should handle this, but just in case)
      audioElement.value.currentTime = 0
      currentTime.value = 0
      if (isPlaying.value) {
        await audioElement.value.play()
      }
    } else if (!loopOne.value) {
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
      syncPlayerChromeCookie()
    } catch (err) {
      console.error('Error saving player state:', err)
    }
  }

  // Load state from localStorage (once per session — safe across Player remounts)
  const loadState = async () => {
    if (playerStateLoaded.value) return
    playerStateLoaded.value = true

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
        if (hasEverHadTrack.value && currentTrack.value) {
          playerHasEntered.value = true
        }
        syncPlayerChromeCookie()

        // Don't auto-play on load, but load the track
        if (currentTrack.value && audioElement.value) {
          const url = await getTrackPlaybackUrl(currentTrack.value)
          if (url) {
            audioElement.value.src = url
            audioElement.value.loop = false // Always false - we handle looping manually
            audioElement.value.preload = 'auto' // Ensure audio is preloaded
            audioElement.value.load()
            loadedAudioCacheKey.value = getAudioCacheKey(currentTrack.value)
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
    stopLoopCheck() // Ensure loop check is stopped
    currentTrack.value = null
    queue.value = []
    originalQueue.value = []
    queueSourceId.value = null
    currentIndex.value = 0
    currentTime.value = 0
    duration.value = 0
    loadedAudioCacheKey.value = null
    hasEverHadTrack.value = false
    playerHasEntered.value = false
    playerStateLoaded.value = true
    localStorage.removeItem(STORAGE_KEY)
    syncPlayerChromeCookie()
  }

  // Frame-perfect loop check using requestAnimationFrame
  // This runs at 60fps (~16ms intervals) for ultra-seamless looping
  const checkLoopFrame = () => {
    if (!audioElement.value || !loopOne.value || !isPlaying.value || duration.value === 0) {
      loopCheckAnimationFrame.value = null
      return
    }
    
    const current = audioElement.value.currentTime
    currentTime.value = current
    
    // Ultra-tight threshold: ~1 frame at 60fps (~0.016 seconds) 
    // For very short beats, use an even tighter threshold (~0.008 seconds = half frame)
    // This ensures we catch the end within milliseconds for truly seamless looping
    const threshold = duration.value < 5 ? 0.008 : 0.016
    const timeUntilEnd = duration.value - current
    
    // If we're within the threshold, immediately loop
    if (timeUntilEnd <= threshold && timeUntilEnd > 0) {
      // Immediately seek to 0 for seamless loop
      // This happens at frame-level precision (60fps = ~16ms checks), eliminating any gap
      audioElement.value.currentTime = 0
      currentTime.value = 0
    }
    
    // Continue the animation loop
    loopCheckAnimationFrame.value = requestAnimationFrame(checkLoopFrame)
  }

  // Start the frame-perfect loop check
  const startLoopCheck = () => {
    if (loopOne.value && isPlaying.value && !loopCheckAnimationFrame.value) {
      loopCheckAnimationFrame.value = requestAnimationFrame(checkLoopFrame)
    }
  }

  // Stop the frame-perfect loop check
  const stopLoopCheck = () => {
    if (loopCheckAnimationFrame.value) {
      cancelAnimationFrame(loopCheckAnimationFrame.value)
      loopCheckAnimationFrame.value = null
    }
  }

  // Update current time (used by timeupdate event for UI updates)
  const updateTime = () => {
    if (audioElement.value) {
      const current = audioElement.value.currentTime
      currentTime.value = current
      tickListenSession(current)
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
    audioElement.value = el
    if (el) {
      el.volume = volume.value
      el.loop = false // Always false - we handle looping manually in updateTime for seamless control
      el.preload = 'auto' // Preload audio for seamless playback
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

  // Update current track if it matches the updated track
  const updateCurrentTrack = async (updatedTrack: any) => {
    if (!updatedTrack || !currentTrack.value) return
    
    // Check if the updated track is the current track
    if (String(currentTrack.value.id) === String(updatedTrack.id)) {
      const oldPath = currentTrack.value.storage_path
      const newPath = updatedTrack.storage_path
      const oldCacheKey = getAudioCacheKey(currentTrack.value)
      
      if (oldCacheKey) {
        signedUrlCache.value.delete(oldCacheKey)
      }
      
      // Update the current track with new data
      currentTrack.value = {
        ...currentTrack.value,
        ...updatedTrack
      }
      
      // If storage path changed and audio is loaded, reload with new URL from the start
      if (newPath && oldPath !== newPath && audioElement.value) {
        const wasPlaying = isPlaying.value
        await endListenSession()

        const trackToLoad = currentTrack.value
        if (!trackToLoad) return

        const loaded = await applyAudioSrc(trackToLoad, { seekToZero: true })
        if (loaded && wasPlaying) {
          await play()
        } else if (!loaded) {
          isPlaying.value = false
          console.error('Player: Failed to get signed URL for updated track')
        }
      }
      
      // Update queue if this track is in it
      const queueIndex = queue.value.findIndex(t => String(t.id) === String(updatedTrack.id))
      if (queueIndex !== -1) {
        queue.value[queueIndex] = {
          ...queue.value[queueIndex],
          ...updatedTrack
        }
      }
      
      // Update originalQueue as well
      const originalQueueIndex = originalQueue.value.findIndex(t => String(t.id) === String(updatedTrack.id))
      if (originalQueueIndex !== -1) {
        originalQueue.value[originalQueueIndex] = {
          ...originalQueue.value[originalQueueIndex],
          ...updatedTrack
        }
      }
      
      saveState()
    }
  }

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
    playerHasEntered,
    shouldReservePlayerChrome,
    audioElement,
    loadedAudioCacheKey,
    
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
    clearPlayer,
    updateCurrentTrack,
    replaceCurrentVersion,
    isLoadedAudio,
  }
}

