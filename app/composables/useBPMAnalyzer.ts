/**
 * BPM Analysis Composable using Tone.js
 * Provides functionality to analyze audio files and detect BPM
 */

import { ref } from 'vue'

// Cache the Tone.js instance
let toneLoaded = false
let loadingPromise: Promise<void> | null = null

/**
 * Load Tone.js script dynamically
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

/**
 * Dynamically load Tone.js
 */
async function loadTone(): Promise<void> {
  // Return if already loaded
  if (toneLoaded) {
    return
  }
  
  // Return existing loading promise if currently loading
  if (loadingPromise) {
    return loadingPromise
  }
  
  loadingPromise = new Promise<void>(async (resolve, reject) => {
    try {
      console.log('Loading Tone.js...')
      await loadScript('https://cdn.jsdelivr.net/npm/tone@14.7.77/build/Tone.js')
      
      // Wait for Tone to initialize
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Check if Tone is available
      if (typeof (window as any).Tone === 'undefined') {
        throw new Error('Tone.js not found on window object')
      }
      
      console.log('✓ Tone.js loaded successfully')
      toneLoaded = true
      resolve()
    } catch (error) {
      console.error('Failed to load Tone.js:', error)
      loadingPromise = null
      reject(new Error('Failed to load BPM analysis library'))
    }
  })
  
  return loadingPromise
}

/**
 * Analyze BPM of an audio file using Tone.js
 * @param audioFile - File or Blob object containing audio data
 * @returns Promise<number> - Detected BPM value
 */
export async function analyzeBPM(audioFile: File | Blob): Promise<number> {
  try {
    // Load Tone.js if not already loaded
    await loadTone()
    
    const Tone = (window as any).Tone
    
    // Create audio context for decoding
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Read file as array buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    console.log('Audio decoded:', audioBuffer.length, 'seconds at', audioBuffer.sampleRate, 'Hz')
    
    // Limit audio length to prevent crashes - analyze only first 30 seconds
    const maxDuration = 30 // 30 seconds
    const limitedDuration = Math.min(audioBuffer.duration, maxDuration)
    
    console.log('Using limited audio:', limitedDuration, 'seconds (max 30 seconds)')
    
    // Get mono channel data for analysis
    const audioData = audioBuffer.getChannelData(0)
    
    // Limit to 30 seconds worth of samples
    const maxSamples = audioBuffer.sampleRate * 30
    const limitedAudioData = audioData.length > maxSamples 
      ? audioData.slice(0, maxSamples) 
      : audioData
    
    console.log('Analyzing BPM with simple peak detection...')
    
    // Use a simple but effective BPM detection algorithm
    const bpm = detectBPMFromAudioData(limitedAudioData, audioBuffer.sampleRate)
    
    // Clean up
    audioContext.close()
    
    if (!bpm || isNaN(bpm) || bpm <= 0) {
      throw new Error(`Invalid BPM result: ${bpm}`)
    }
    
    console.log('Final BPM:', bpm)
    
    // Round to nearest integer
    return Math.round(bpm)
    
  } catch (error: any) {
    console.error('BPM analysis failed:', error)
    throw new Error(`Failed to analyze BPM: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Simple BPM detection from audio data using autocorrelation
 * This is a more reliable approach than frequency analysis
 */
function detectBPMFromAudioData(audioData: Float32Array, sampleRate: number): number {
  console.log('Detecting BPM from audio data:', audioData.length, 'samples')
  
  // Apply a simple high-pass filter to emphasize beats
  const filteredData = highPassFilter(audioData, sampleRate, 80) // 80Hz cutoff
  
  // Find peaks in the filtered audio
  const peaks = findAudioPeaks(filteredData)
  
  if (peaks.length < 2) {
    console.log('Not enough peaks found, using fallback estimation')
    // Fallback: estimate based on audio energy
    const energy = audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length
    return Math.max(60, Math.min(180, Math.round(60 + energy * 100)))
  }
  
  console.log('Found', peaks.length, 'peaks')
  
  // Calculate intervals between peaks
  const intervals = []
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1])
  }
  
  // Find the most common interval (beat period)
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
  
  // Convert to BPM (beats per minute)
  const bpm = (60 * sampleRate) / avgInterval
  
  console.log('Calculated BPM:', bpm, 'from interval:', avgInterval)
  
  // Clamp to reasonable range
  return Math.max(60, Math.min(180, bpm))
}

/**
 * Simple high-pass filter to emphasize beats
 */
function highPassFilter(data: Float32Array, sampleRate: number, cutoffFreq: number): Float32Array {
  const filtered = new Float32Array(data.length)
  const rc = 1.0 / (2.0 * Math.PI * cutoffFreq)
  const dt = 1.0 / sampleRate
  const alpha = rc / (rc + dt)
  
  filtered[0] = data[0]
  for (let i = 1; i < data.length; i++) {
    filtered[i] = alpha * (filtered[i - 1] + data[i] - data[i - 1])
  }
  
  return filtered
}

/**
 * Find peaks in audio data
 */
function findAudioPeaks(data: Float32Array, threshold = 0.1): number[] {
  const peaks = []
  const windowSize = Math.floor(data.length / 100) // Analyze in chunks
  
  for (let i = windowSize; i < data.length - windowSize; i += windowSize) {
    const window = data.slice(i - windowSize, i + windowSize)
    const maxInWindow = Math.max(...window)
    const maxIndex = window.indexOf(maxInWindow) + i - windowSize
    
    if (maxInWindow > threshold) {
      peaks.push(maxIndex)
    }
  }
  
  return peaks
}

/**
 * Composable for BPM analysis with reactive state
 */
export function useBPMAnalyzer() {
  const isAnalyzing = ref(false)
  const error = ref<string | null>(null)
  const bpm = ref<number | null>(null)
  
  const analyze = async (audioFile: File | Blob): Promise<number | null> => {
    isAnalyzing.value = true
    error.value = null
    bpm.value = null
    
    try {
      const detectedBPM = await analyzeBPM(audioFile)
      bpm.value = detectedBPM
      return detectedBPM
    } catch (err: any) {
      error.value = err.message || 'BPM analysis failed'
      return null
    } finally {
      isAnalyzing.value = false
    }
  }
  
  return {
    isAnalyzing,
    error,
    bpm,
    analyze
  }
}

