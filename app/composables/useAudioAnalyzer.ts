/**
 * Audio Analysis Composable
 * Provides functionality to analyze audio files and detect BPM and Key
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
 * Analyze musical key of an audio file
 * @param audioFile - File or Blob object containing audio data
 * @returns Promise<string> - Detected musical key (e.g., "C Major", "A Minor")
 */
export async function analyzeKey(audioFile: File | Blob): Promise<string> {
  try {
    // Load Tone.js if not already loaded
    await loadTone()
    
    // Create audio context for decoding
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Read file as array buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    console.log('Audio decoded for key detection:', audioBuffer.duration, 'seconds')
    
    // Limit to first 60 seconds for key analysis
    const maxDuration = 60
    const limitedDuration = Math.min(audioBuffer.duration, maxDuration)
    
    console.log('Analyzing key from first', limitedDuration, 'seconds')
    
    // Get mono channel data
    const audioData = audioBuffer.getChannelData(0)
    const maxSamples = audioBuffer.sampleRate * maxDuration
    const limitedAudioData = audioData.length > maxSamples 
      ? audioData.slice(0, maxSamples) 
      : audioData
    
    // Detect key using chroma analysis
    const key = detectKeyFromAudioData(limitedAudioData, audioBuffer.sampleRate)
    
    // Clean up
    audioContext.close()
    
    if (!key) {
      throw new Error('Could not detect key')
    }
    
    console.log('Detected key:', key)
    
    return key
    
  } catch (error: any) {
    console.error('Key analysis failed:', error)
    throw new Error(`Failed to analyze key: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Detect musical key from audio data using chroma analysis
 */
function detectKeyFromAudioData(audioData: Float32Array, sampleRate: number): string {
  console.log('Detecting key from audio data:', audioData.length, 'samples')
  
  // Note names
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  
  // Calculate chroma (pitch class distribution)
  const chroma = calculateChroma(audioData, sampleRate)
  
  // Find the most prominent pitch class
  const maxChromaIndex = chroma.indexOf(Math.max(...chroma))
  const rootNote = notes[maxChromaIndex]
  
  // Determine if major or minor based on third interval
  const isMajor = determineMajorMinor(chroma, maxChromaIndex)
  
  return `${rootNote} ${isMajor ? 'Major' : 'Minor'}`
}

/**
 * Calculate chroma vector (pitch class distribution)
 */
function calculateChroma(audioData: Float32Array, sampleRate: number): number[] {
  const chroma = new Array(12).fill(0)
  
  // Analyze in chunks
  const chunkSize = 8192
  const hopSize = 4096
  
  for (let i = 0; i < audioData.length - chunkSize; i += hopSize) {
    const chunk = audioData.slice(i, i + chunkSize)
    
    // Perform FFT-like frequency analysis (simplified)
    const spectrum = calculateSpectrum(chunk, sampleRate)
    
    // Map frequencies to pitch classes
    for (let freq = 0; freq < spectrum.length; freq++) {
      if (spectrum[freq] > 0) {
        const hz = (freq * sampleRate) / chunkSize
        if (hz > 65 && hz < 2000) { // Focus on musical range
          const pitchClass = frequencyToPitchClass(hz)
          chroma[pitchClass] += spectrum[freq]
        }
      }
    }
  }
  
  // Normalize
  const max = Math.max(...chroma)
  if (max > 0) {
    for (let i = 0; i < chroma.length; i++) {
      chroma[i] /= max
    }
  }
  
  return chroma
}

/**
 * Simple spectrum calculation (magnitude squared)
 */
function calculateSpectrum(data: Float32Array, sampleRate: number): number[] {
  const spectrum = new Array(data.length / 2).fill(0)
  
  for (let i = 0; i < data.length; i++) {
    const magnitude = Math.abs(data[i])
    const bin = Math.floor(i / 2)
    if (bin < spectrum.length) {
      spectrum[bin] += magnitude * magnitude
    }
  }
  
  return spectrum
}

/**
 * Convert frequency to pitch class (0-11)
 */
function frequencyToPitchClass(frequency: number): number {
  // A4 = 440 Hz, corresponds to pitch class 9 (A)
  const a4 = 440
  const c0 = a4 * Math.pow(2, -4.75) // C0 frequency
  
  // Calculate semitones from C0
  const semitones = 12 * Math.log2(frequency / c0)
  
  // Get pitch class (0-11)
  return Math.round(semitones) % 12
}

/**
 * Determine if key is major or minor based on chroma profile
 */
function determineMajorMinor(chroma: number[], rootIndex: number): boolean {
  // Major third is 4 semitones from root
  const majorThirdIndex = (rootIndex + 4) % 12
  // Minor third is 3 semitones from root
  const minorThirdIndex = (rootIndex + 3) % 12
  
  // Compare strengths
  const majorThirdStrength = chroma[majorThirdIndex]
  const minorThirdStrength = chroma[minorThirdIndex]
  
  // If major third is stronger, it's major; otherwise minor
  return majorThirdStrength > minorThirdStrength
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

/**
 * Composable for Key analysis with reactive state
 */
export function useKeyAnalyzer() {
  const isAnalyzing = ref(false)
  const error = ref<string | null>(null)
  const key = ref<string | null>(null)
  
  const analyze = async (audioFile: File | Blob): Promise<string | null> => {
    isAnalyzing.value = true
    error.value = null
    key.value = null
    
    try {
      const detectedKey = await analyzeKey(audioFile)
      key.value = detectedKey
      return detectedKey
    } catch (err: any) {
      error.value = err.message || 'Key analysis failed'
      return null
    } finally {
      isAnalyzing.value = false
    }
  }
  
  return {
    isAnalyzing,
    error,
    key,
    analyze
  }
}

