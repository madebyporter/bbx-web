import { ref, computed } from 'vue'
import { useSupabase } from '~/utils/supabase'

export interface StemTrack {
  id: number
  title: string
  artist: string
  storage_path: string
  duration: number
  isMuted: boolean
  isSolo: boolean
  volume: number
}

interface AudioContextTrack {
  track: StemTrack
  audioBuffer: AudioBuffer | null
  source: AudioBufferSourceNode | null
  gainNode: GainNode | null
}

// Global state - shared across all instances
const isStemPlayerActive = ref(false)
const stemTracks = ref<StemTrack[]>([])
const audioContext = ref<AudioContext | null>(null)
const audioTracks = ref<Map<number, AudioContextTrack>>(new Map())
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const masterVolume = ref(1)
const startTime = ref(0)
const pauseTime = ref(0)
const animationFrameId = ref<number | null>(null)
const urlCache = ref<Map<string, { url: string; expiry: number }>>(new Map())

export function useStemPlayer() {
  const { supabase } = useSupabase()

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get signed URL from Supabase Storage (with caching)
  const getSignedUrl = async (filepath: string): Promise<string | null> => {
    // Check cache first - check if URL is still valid
    const cached = urlCache.value.get(filepath)
    if (cached && cached.expiry > Date.now()) {
      console.log('[StemPlayer] Using cached signed URL')
      return cached.url
    }

    try {
      // Request 24-hour expiry for signed URLs
      const { data, error } = await supabase.storage
        .from('sounds')
        .createSignedUrl(filepath, 86400) // 24 hours

      if (error) {
        console.error('[StemPlayer] Error getting signed URL:', error)
        return null
      }

      if (!data?.signedUrl) {
        console.error('[StemPlayer] No signed URL returned for:', filepath)
        return null
      }

      console.log('[StemPlayer] Generated new signed URL for:', filepath)

      // Cache the URL for 23 hours (safe margin)
      urlCache.value.set(filepath, {
        url: data.signedUrl,
        expiry: Date.now() + (23 * 60 * 60 * 1000)
      })

      return data.signedUrl
    } catch (err) {
      console.error('[StemPlayer] Error getting signed URL:', err)
      return null
    }
  }

  // Initialize audio context
  const initAudioContext = () => {
    if (!audioContext.value) {
      audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContext.value
  }

  // Load audio buffer from URL
  const loadAudioBuffer = async (url: string): Promise<AudioBuffer | null> => {
    const ctx = initAudioContext()
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      return audioBuffer
    } catch (err) {
      console.error('Error loading audio buffer:', err)
      return null
    }
  }

  // Load all tracks
  const loadTracks = async (tracks: any[]) => {
    console.log('StemPlayer: Loading tracks', tracks.length)
    isStemPlayerActive.value = false
    isPlaying.value = false
    currentTime.value = 0
    pauseTime.value = 0
    
    // Stop any existing playback
    stopAllSources()
    
    // Reset state
    stemTracks.value = tracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      storage_path: track.storage_path,
      duration: track.duration,
      isMuted: false,
      isSolo: false,
      volume: 1
    }))

    audioTracks.value.clear()

    // Load all audio buffers
    const ctx = initAudioContext()
    let maxDuration = 0

    for (const track of stemTracks.value) {
      const url = await getSignedUrl(track.storage_path)
      if (!url) {
        console.error('[StemPlayer] Failed to get signed URL for track:', track.title)
        continue
      }

      const audioBuffer = await loadAudioBuffer(url)
      if (!audioBuffer) {
        console.error('[StemPlayer] Failed to load audio buffer for track:', track.title)
        continue
      }

      // Track max duration
      if (audioBuffer.duration > maxDuration) {
        maxDuration = audioBuffer.duration
      }

      audioTracks.value.set(track.id, {
        track,
        audioBuffer,
        source: null,
        gainNode: null
      })
    }

    duration.value = maxDuration
    console.log('StemPlayer: All tracks loaded, max duration:', maxDuration)
  }

  // Create and connect source nodes
  const createSources = (startOffset: number = 0) => {
    const ctx = audioContext.value
    if (!ctx) return

    stopAllSources()

    const hasSolo = stemTracks.value.some(t => t.isSolo)

    audioTracks.value.forEach((audioTrack) => {
      const { track, audioBuffer } = audioTrack
      if (!audioBuffer) return

      // Create source
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer

      // Create gain node for individual volume
      const gainNode = ctx.createGain()
      
      // Calculate effective volume based on mute/solo state
      let effectiveVolume = track.volume
      if (track.isMuted) {
        effectiveVolume = 0
      } else if (hasSolo && !track.isSolo) {
        effectiveVolume = 0
      }
      
      gainNode.gain.value = effectiveVolume * masterVolume.value

      // Connect: source -> gain -> destination
      source.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Store references
      audioTrack.source = source
      audioTrack.gainNode = gainNode

      // Handle track end
      source.onended = () => {
        if (isPlaying.value && currentTime.value >= duration.value) {
          stop()
        }
      }

      // Start playback
      source.start(0, startOffset)
    })
  }

  // Stop all source nodes
  const stopAllSources = () => {
    audioTracks.value.forEach((audioTrack) => {
      if (audioTrack.source) {
        try {
          audioTrack.source.stop()
          audioTrack.source.disconnect()
        } catch (err) {
          // Already stopped
        }
        audioTrack.source = null
      }
      if (audioTrack.gainNode) {
        audioTrack.gainNode.disconnect()
        audioTrack.gainNode = null
      }
    })
  }

  // Update current time
  const updateCurrentTime = () => {
    if (!isPlaying.value || !audioContext.value) return

    const elapsed = audioContext.value.currentTime - startTime.value
    currentTime.value = pauseTime.value + elapsed

    if (currentTime.value >= duration.value) {
      stop()
      return
    }

    animationFrameId.value = requestAnimationFrame(updateCurrentTime)
  }

  // Play
  const play = () => {
    if (audioTracks.value.size === 0) {
      console.warn('StemPlayer: No tracks loaded')
      return
    }

    const ctx = initAudioContext()
    
    // Resume audio context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    createSources(pauseTime.value)
    startTime.value = ctx.currentTime
    isPlaying.value = true
    isStemPlayerActive.value = true

    // Start time update loop
    updateCurrentTime()

    console.log('StemPlayer: Playing from', pauseTime.value)
  }

  // Pause
  const pause = () => {
    if (!isPlaying.value) return

    pauseTime.value = currentTime.value
    stopAllSources()
    isPlaying.value = false
    isStemPlayerActive.value = false

    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }

    console.log('StemPlayer: Paused at', pauseTime.value)
  }

  // Stop
  const stop = () => {
    stopAllSources()
    isPlaying.value = false
    isStemPlayerActive.value = false
    currentTime.value = 0
    pauseTime.value = 0
    startTime.value = 0

    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }

    console.log('StemPlayer: Stopped')
  }

  // Toggle play/pause
  const togglePlayPause = () => {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  // Seek to specific time
  const seekTo = (time: number) => {
    const wasPlaying = isPlaying.value
    
    if (wasPlaying) {
      stopAllSources()
    }

    pauseTime.value = Math.max(0, Math.min(time, duration.value))
    currentTime.value = pauseTime.value

    if (wasPlaying) {
      createSources(pauseTime.value)
      startTime.value = audioContext.value!.currentTime
    }

    console.log('StemPlayer: Seeked to', pauseTime.value)
  }

  // Toggle mute for a track
  const toggleMute = (trackId: number) => {
    const track = stemTracks.value.find(t => t.id === trackId)
    if (!track) return

    track.isMuted = !track.isMuted
    updateTrackGain(trackId)
  }

  // Toggle solo for a track
  const toggleSolo = (trackId: number) => {
    const track = stemTracks.value.find(t => t.id === trackId)
    if (!track) return

    track.isSolo = !track.isSolo
    
    // Update all track gains (solo affects multiple tracks)
    audioTracks.value.forEach((_, id) => updateTrackGain(id))
  }

  // Set individual track volume
  const setTrackVolume = (trackId: number, volume: number) => {
    const track = stemTracks.value.find(t => t.id === trackId)
    if (!track) return

    track.volume = Math.max(0, Math.min(1, volume))
    updateTrackGain(trackId)
  }

  // Set master volume
  const setMasterVolume = (volume: number) => {
    masterVolume.value = Math.max(0, Math.min(1, volume))
    audioTracks.value.forEach((_, id) => updateTrackGain(id))
  }

  // Update track gain node
  const updateTrackGain = (trackId: number) => {
    const audioTrack = audioTracks.value.get(trackId)
    const track = stemTracks.value.find(t => t.id === trackId)
    
    if (!audioTrack?.gainNode || !track) return

    const hasSolo = stemTracks.value.some(t => t.isSolo)
    let effectiveVolume = track.volume

    if (track.isMuted) {
      effectiveVolume = 0
    } else if (hasSolo && !track.isSolo) {
      effectiveVolume = 0
    }

    audioTrack.gainNode.gain.value = effectiveVolume * masterVolume.value
  }

  // Cleanup
  const cleanup = () => {
    stop()
    audioTracks.value.clear()
    stemTracks.value = []
    
    if (audioContext.value) {
      audioContext.value.close()
      audioContext.value = null
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
    // Global state
    isStemPlayerActive,
    
    // State
    stemTracks,
    isPlaying,
    currentTime,
    duration,
    masterVolume,
    
    // Computed
    formattedCurrentTime,
    formattedDuration,
    progress,
    
    // Methods
    loadTracks,
    play,
    pause,
    stop,
    togglePlayPause,
    seekTo,
    toggleMute,
    toggleSolo,
    setTrackVolume,
    setMasterVolume,
    cleanup
  }
}

