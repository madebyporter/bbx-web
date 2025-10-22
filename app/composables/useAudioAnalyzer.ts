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
    
    // Limit audio length to prevent crashes - analyze only first 60 seconds
    // Extended to 60s for better tempo detection on tracks with intros
    const maxDuration = 60 // 60 seconds
    const limitedDuration = Math.min(audioBuffer.duration, maxDuration)
    
    console.log('Using limited audio:', limitedDuration, 'seconds (max 60 seconds)')
    
    // Get mono channel data for analysis
    const audioData = audioBuffer.getChannelData(0)
    
    // Limit to 60 seconds worth of samples
    const maxSamples = audioBuffer.sampleRate * 60
    const limitedAudioData = audioData.length > maxSamples 
      ? audioData.slice(0, maxSamples) 
      : audioData
    
    console.log('Analyzing BPM with multiple detection methods...')
    
    // Run multiple detection passes with different filter settings
    const detectionResults = detectBPMMultipleMethods(limitedAudioData, audioBuffer.sampleRate)
    
    console.log('Detection results:', detectionResults)
    
    // Choose the most reliable BPM from multiple methods
    const bpm = chooseMostReliableBPM(detectionResults)
    
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
 * Run multiple BPM detection methods with different parameters
 * Returns array of results for analysis
 */
function detectBPMMultipleMethods(audioData: Float32Array, sampleRate: number): Array<{method: string, bpm: number, confidence: number, peakCount: number}> {
  const results = []
  
  // Method 1: Kick drum detection (40-150Hz bandpass)
  console.log('Method 1: Kick drum detection (40-150Hz)')
  const kick = detectKickDrumBPM(audioData, sampleRate)
  results.push({ method: 'Kick drum (40-150Hz)', bpm: kick.bpm, confidence: 0.8, peakCount: kick.peakCount })
  
  // Method 2: Snare detection (150-500Hz bandpass) - Catches backbeat
  console.log('Method 2: Snare detection (150-500Hz)')
  const snare = detectSnareBPM(audioData, sampleRate)
  results.push({ method: 'Snare (150-500Hz)', bpm: snare.bpm, confidence: 0.8, peakCount: snare.peakCount })
  
  // Method 3: Low-frequency analysis (80Hz high-pass) - General beat detection
  console.log('Method 3: Low-frequency analysis (80Hz cutoff)')
  const low = detectBPMFromAudioData(audioData, sampleRate, 80)
  results.push({ method: 'Low-frequency (80Hz)', bpm: low.bpm, confidence: 0.7, peakCount: low.peakCount })
  
  // Method 4: Mid-frequency analysis (150Hz high-pass) - Fallback
  console.log('Method 4: Mid-frequency analysis (150Hz cutoff)')
  const mid = detectBPMFromAudioData(audioData, sampleRate, 150)
  results.push({ method: 'Mid-frequency (150Hz)', bpm: mid.bpm, confidence: 0.6, peakCount: mid.peakCount })
  
  return results
}

/**
 * Detect BPM specifically from kick drums
 * Uses bandpass filter (40-150Hz) to isolate kick frequency range
 * Falls back to strongest peaks if no clear kick pattern
 */
function detectKickDrumBPM(audioData: Float32Array, sampleRate: number): {bpm: number, peakCount: number} {
  console.log('Isolating kick drum frequencies (40-150Hz)...')
  
  // Apply low-pass filter first (removes everything above 150Hz)
  const lowPassed = lowPassFilter(audioData, sampleRate, 150)
  
  // Then apply high-pass filter (removes everything below 40Hz - removes sub-bass rumble)
  const kickIsolated = highPassFilter(lowPassed, sampleRate, 40)
  
  console.log('Kick drum isolated, finding peaks...')
  
  // Find peaks with spacing suitable for kicks
  const peaks = findKickPeaks(kickIsolated, sampleRate)
  
  if (peaks.length < 2) {
    console.log('[Kick] Not enough peaks, falling back to strongest peaks in full spectrum')
    // Fallback: Use the strongest peaks from full spectrum
    const strongPeaks = findStrongestPeaks(audioData, sampleRate, 50) // Find 50 strongest peaks
    if (strongPeaks.length < 2) {
      return { bpm: 120, peakCount: 0 } // Default fallback
    }
    
    const intervals = []
    for (let i = 1; i < strongPeaks.length; i++) {
      const curr = strongPeaks[i]
      const prev = strongPeaks[i - 1]
      if (curr !== undefined && prev !== undefined) {
        intervals.push(curr - prev)
      }
    }
    if (intervals.length === 0) {
      return { bpm: 120, peakCount: strongPeaks.length }
    }
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
    const bpm = (60 * sampleRate) / avgInterval
    return { bpm: Math.max(60, Math.min(200, bpm)), peakCount: strongPeaks.length }
  }
  
  console.log(`[Kick] Found ${peaks.length} kick peaks`)
  
  // Calculate intervals between kicks
  const intervals = []
  for (let i = 1; i < peaks.length; i++) {
    const curr = peaks[i]
    const prev = peaks[i - 1]
    if (curr !== undefined && prev !== undefined) {
      intervals.push(curr - prev)
    }
  }
  
  if (intervals.length === 0) {
    return { bpm: 120, peakCount: peaks.length }
  }
  
  // Use median instead of average to be more robust against outliers
  const sortedIntervals = intervals.sort((a, b) => a - b)
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)]
  
  if (!medianInterval || medianInterval <= 0) {
    return { bpm: 120, peakCount: peaks.length }
  }
  
  // Convert to BPM
  const bpm = (60 * sampleRate) / medianInterval
  
  console.log(`[Kick] Calculated BPM: ${bpm.toFixed(1)} from median interval: ${medianInterval}`)
  
  return { bpm: Math.max(60, Math.min(200, bpm)), peakCount: peaks.length }
}

/**
 * Find kick drum peaks with balanced criteria
 * Kicks are usually the loudest and most spaced out elements
 */
function findKickPeaks(data: Float32Array, sampleRate: number): number[] {
  const peaks = []
  
  // Balanced threshold for kicks - prominent but not too strict
  const rms = Math.sqrt(data.reduce((sum, val) => sum + val * val, 0) / data.length)
  const threshold = rms * 2.5 // 2.5x RMS - strong hits but not overly restrictive
  
  // Kicks are usually spaced at least 350ms apart (170 BPM = 0.35s per beat)
  // This allows for faster trap/EDM tempos while still preventing hi-hat detection
  const minPeakSpacing = Math.floor(sampleRate * 0.35) // 350ms
  
  let lastPeakIndex = -minPeakSpacing
  
  for (let i = 0; i < data.length; i++) {
    const val = data[i]
    if (val === undefined) continue
    const sample = Math.abs(val)
    
    if (sample > threshold && (i - lastPeakIndex) >= minPeakSpacing) {
      // Verify this is a local maximum in 100ms window (kick transient)
      const windowSize = Math.floor(sampleRate * 0.1) // 100ms
      const start = Math.max(0, i - windowSize)
      const end = Math.min(data.length, i + windowSize)
      
      let isLocalMax = true
      for (let j = start; j < end; j++) {
        const jVal = data[j]
        if (jVal !== undefined && Math.abs(jVal) > sample) {
          isLocalMax = false
          break
        }
      }
      
      if (isLocalMax) {
        peaks.push(i)
        lastPeakIndex = i
      }
    }
  }
  
  console.log(`Found ${peaks.length} kick peaks with min spacing ${minPeakSpacing} samples (${(minPeakSpacing/sampleRate).toFixed(3)}s)`)
  
  return peaks
}

/**
 * Detect BPM from snare drums
 * Uses bandpass filter (150-500Hz) to isolate snare frequency range
 * Snares typically appear on backbeats (2 and 4 in 4/4 time)
 */
function detectSnareBPM(audioData: Float32Array, sampleRate: number): {bpm: number, peakCount: number} {
  console.log('Isolating snare frequencies (150-500Hz)...')
  
  // Apply low-pass filter first (removes everything above 500Hz)
  const lowPassed = lowPassFilter(audioData, sampleRate, 500)
  
  // Then apply high-pass filter (removes everything below 150Hz)
  const snareIsolated = highPassFilter(lowPassed, sampleRate, 150)
  
  console.log('Snare isolated, finding peaks...')
  
  // Find peaks with spacing suitable for snares
  const peaks = findSnarePeaks(snareIsolated, sampleRate)
  
  if (peaks.length < 2) {
    console.log('[Snare] Not enough peaks found')
    return { bpm: 120, peakCount: 0 }
  }
  
  console.log(`[Snare] Found ${peaks.length} snare peaks`)
  
  // Calculate intervals between snares
  const intervals = []
  for (let i = 1; i < peaks.length; i++) {
    const curr = peaks[i]
    const prev = peaks[i - 1]
    if (curr !== undefined && prev !== undefined) {
      intervals.push(curr - prev)
    }
  }
  
  if (intervals.length === 0) {
    return { bpm: 120, peakCount: peaks.length }
  }
  
  // Use median interval
  const sortedIntervals = intervals.sort((a, b) => a - b)
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)]
  
  if (!medianInterval || medianInterval <= 0) {
    return { bpm: 120, peakCount: peaks.length }
  }
  
  // Convert to BPM
  // Note: snares might be on backbeats (half tempo), so we might need to double
  let bpm = (60 * sampleRate) / medianInterval
  
  console.log(`[Snare] Calculated BPM: ${bpm.toFixed(1)} from median interval: ${medianInterval}`)
  
  return { bpm: Math.max(60, Math.min(200, bpm)), peakCount: peaks.length }
}

/**
 * Find snare drum peaks
 * Snares are typically crisp hits in the mid-frequency range
 */
function findSnarePeaks(data: Float32Array, sampleRate: number): number[] {
  const peaks = []
  
  // Calculate threshold
  const rms = Math.sqrt(data.reduce((sum, val) => sum + val * val, 0) / data.length)
  const threshold = rms * 2.0 // 2x RMS for snares
  
  // Snares can appear more frequently than kicks (backbeats)
  // Allow for 300ms spacing (200 BPM = 0.3s)
  const minPeakSpacing = Math.floor(sampleRate * 0.3) // 300ms
  
  let lastPeakIndex = -minPeakSpacing
  
  for (let i = 0; i < data.length; i++) {
    const val = data[i]
    if (val === undefined) continue
    const sample = Math.abs(val)
    
    if (sample > threshold && (i - lastPeakIndex) >= minPeakSpacing) {
      // Verify this is a local maximum in 80ms window (snare transient is sharper)
      const windowSize = Math.floor(sampleRate * 0.08) // 80ms
      const start = Math.max(0, i - windowSize)
      const end = Math.min(data.length, i + windowSize)
      
      let isLocalMax = true
      for (let j = start; j < end; j++) {
        const jVal = data[j]
        if (jVal !== undefined && Math.abs(jVal) > sample) {
          isLocalMax = false
          break
        }
      }
      
      if (isLocalMax) {
        peaks.push(i)
        lastPeakIndex = i
      }
    }
  }
  
  console.log(`Found ${peaks.length} snare peaks with min spacing ${minPeakSpacing} samples (${(minPeakSpacing/sampleRate).toFixed(3)}s)`)
  
  return peaks
}

/**
 * Find the N strongest peaks in the audio as fallback
 */
function findStrongestPeaks(data: Float32Array, sampleRate: number, numPeaks: number): number[] {
  const peakCandidates: {index: number, value: number}[] = []
  
  // Find all local maxima
  const windowSize = Math.floor(sampleRate * 0.05) // 50ms window
  for (let i = windowSize; i < data.length - windowSize; i++) {
    const val = data[i]
    if (val === undefined) continue
    const sample = Math.abs(val)
    
    let isLocalMax = true
    for (let j = i - windowSize; j < i + windowSize; j++) {
      const jVal = data[j]
      if (j !== i && jVal !== undefined && Math.abs(jVal) > sample) {
        isLocalMax = false
        break
      }
    }
    
    if (isLocalMax) {
      peakCandidates.push({ index: i, value: sample })
    }
  }
  
  // Sort by value and take the strongest N peaks
  peakCandidates.sort((a, b) => b.value - a.value)
  const topPeaks = peakCandidates.slice(0, numPeaks)
  
  // Sort by index (time) for interval calculation
  topPeaks.sort((a, b) => a.index - b.index)
  
  console.log(`[Fallback] Found ${topPeaks.length} strongest peaks`)
  
  return topPeaks.map(p => p.index)
}

/**
 * Simple low-pass filter (removes high frequencies)
 */
function lowPassFilter(data: Float32Array, sampleRate: number, cutoffFreq: number): Float32Array {
  const filtered = new Float32Array(data.length)
  const rc = 1.0 / (2.0 * Math.PI * cutoffFreq)
  const dt = 1.0 / sampleRate
  const alpha = dt / (rc + dt)
  
  const firstVal = data[0]
  filtered[0] = firstVal !== undefined ? firstVal : 0
  for (let i = 1; i < data.length; i++) {
    const curr = data[i]
    const filtPrev = filtered[i - 1]
    if (curr !== undefined && filtPrev !== undefined) {
      filtered[i] = filtPrev + alpha * (curr - filtPrev)
    }
  }
  
  return filtered
}

/**
 * Choose the most reliable BPM from multiple detection results
 * Uses harmonic analysis, peak count, and consensus to pick best result
 */
function chooseMostReliableBPM(results: Array<{method: string, bpm: number, confidence: number, peakCount: number}>): number {
  console.log('Analyzing detection results to find most reliable BPM...')
  
  // Extract BPM values
  const bpms = results.map(r => r.bpm)
  
  // Check for harmonic relationships
  // Common issues: 2x, 1.5x, 1.33x, 0.5x, 0.67x
  const harmonicFactors = [0.5, 0.67, 1, 1.33, 1.5, 2]
  
  // For each BPM, calculate a comprehensive score
  const scoredResults = results.map((result, idx) => {
    let score = result.confidence
    
    // Boost score based on peak count (more peaks = more reliable)
    // Normalize by expected peaks for 60s: ~60-120 peaks for 60-120 BPM
    const peakScore = Math.min(result.peakCount / 80, 1.5) // Cap at 1.5x boost
    score += peakScore
    
    console.log(`[${result.method}] Base confidence: ${result.confidence}, Peak count: ${result.peakCount}, Peak score: ${peakScore.toFixed(2)}`)
    
    // Check if other BPMs are harmonics of this one
    let harmonicMatches = 0
    for (let i = 0; i < bpms.length; i++) {
      if (i === idx) continue
      
      const otherBPM = bpms[i]
      if (otherBPM === undefined) continue
      
      const ratio = otherBPM / result.bpm
      
      // Check if ratio is close to any harmonic factor
      for (const factor of harmonicFactors) {
        if (Math.abs(ratio - factor) < 0.05) {
          score += 0.3 // Boost score if harmonic relationship found
          harmonicMatches++
          console.log(`Found harmonic: ${otherBPM} is ${factor}x of ${result.bpm}`)
        }
      }
    }
    
    // Penalize results with very few peaks (likely unreliable)
    if (result.peakCount < 10) {
      score *= 0.3 // Heavy penalty for < 10 peaks
      console.log(`[${result.method}] Penalized for low peak count (${result.peakCount})`)
    }
    
    return { 
      bpm: result.bpm, 
      score, 
      method: result.method,
      peakCount: result.peakCount,
      harmonicMatches
    }
  })
  
  console.log('Scored results:', scoredResults)
  
  // Sort by score
  scoredResults.sort((a, b) => b.score - a.score)
  
  const winner = scoredResults[0]
  
  if (!winner) {
    console.log('No valid BPM results found, using default')
    return 120
  }
  
  console.log(`Selected: ${winner.bpm} BPM from ${winner.method} (score: ${winner.score.toFixed(2)}, peaks: ${winner.peakCount})`)
  
  // Final validation: Check if we should prefer consensus over winner
  // If top 2-3 results agree within 5 BPM, but winner is an outlier, pick consensus
  const topResults = scoredResults.slice(0, 3)
  const consensusBPMs = topResults.filter(r => r.peakCount >= 10).map(r => r.bpm)
  
  if (consensusBPMs.length >= 2) {
    // Check if there's a cluster of similar BPMs
    const avgConsensus = consensusBPMs.reduce((sum, bpm) => sum + bpm, 0) / consensusBPMs.length
    const consensusCount = consensusBPMs.filter(bpm => Math.abs(bpm - avgConsensus) < 5).length
    
    if (consensusCount >= 2 && Math.abs(winner.bpm - avgConsensus) > 10) {
      console.log(`Consensus override: ${consensusCount} methods agree on ~${avgConsensus.toFixed(0)} BPM, overriding ${winner.bpm}`)
      return Math.round(avgConsensus)
    }
  }
  
  // Check if we should halve or double the result
  // If winner is > 160 and we have a result around half that with good peak count, prefer the lower one
  if (winner.bpm > 160) {
    const halfBPM = winner.bpm / 2
    const halfCandidate = scoredResults.find(r => Math.abs(r.bpm - halfBPM) < 10 && r.peakCount >= 20)
    if (halfCandidate) {
      console.log(`BPM ${winner.bpm} is high, found close match at half: ${halfCandidate.bpm} with ${halfCandidate.peakCount} peaks`)
      return halfCandidate.bpm
    }
  }
  
  // If winner is < 80 and we have a result around double that with good peak count, prefer the higher one
  if (winner.bpm < 80) {
    const doubleBPM = winner.bpm * 2
    const doubleCandidate = scoredResults.find(r => Math.abs(r.bpm - doubleBPM) < 10 && r.peakCount >= 20)
    if (doubleCandidate) {
      console.log(`BPM ${winner.bpm} is low, found close match at double: ${doubleCandidate.bpm} with ${doubleCandidate.peakCount} peaks`)
      return doubleCandidate.bpm
    }
  }
  
  return winner.bpm
}

/**
 * Simple BPM detection from audio data using autocorrelation
 * This is a more reliable approach than frequency analysis
 * @param cutoffFreq - High-pass filter cutoff frequency (lower = more bass, higher = more treble)
 */
function detectBPMFromAudioData(audioData: Float32Array, sampleRate: number, cutoffFreq: number = 80): {bpm: number, peakCount: number} {
  // Apply a simple high-pass filter to emphasize beats
  const filteredData = highPassFilter(audioData, sampleRate, cutoffFreq)
  
  // Find peaks in the filtered audio
  const peaks = findAudioPeaks(filteredData, sampleRate)
  
  if (peaks.length < 2) {
    console.log(`[${cutoffFreq}Hz] Not enough peaks found, using fallback estimation`)
    // Fallback: estimate based on audio energy
    const energy = audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length
    return { bpm: Math.max(60, Math.min(180, Math.round(60 + energy * 100))), peakCount: 0 }
  }
  
  console.log(`[${cutoffFreq}Hz] Found ${peaks.length} peaks`)
  
  // Calculate intervals between peaks
  const intervals = []
  for (let i = 1; i < peaks.length; i++) {
    const curr = peaks[i]
    const prev = peaks[i - 1]
    if (curr !== undefined && prev !== undefined) {
      intervals.push(curr - prev)
    }
  }
  
  if (intervals.length === 0) {
    return { bpm: 120, peakCount: peaks.length }
  }
  
  // Find the most common interval (beat period)
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
  
  // Convert to BPM (beats per minute)
  const bpm = (60 * sampleRate) / avgInterval
  
  console.log(`[${cutoffFreq}Hz] Calculated BPM: ${bpm.toFixed(1)}`)
  
  // Clamp to reasonable range
  return { bpm: Math.max(60, Math.min(200, bpm)), peakCount: peaks.length }
}

/**
 * Simple high-pass filter to emphasize beats
 */
function highPassFilter(data: Float32Array, sampleRate: number, cutoffFreq: number): Float32Array {
  const filtered = new Float32Array(data.length)
  const rc = 1.0 / (2.0 * Math.PI * cutoffFreq)
  const dt = 1.0 / sampleRate
  const alpha = rc / (rc + dt)
  
  const firstVal = data[0]
  filtered[0] = firstVal !== undefined ? firstVal : 0
  for (let i = 1; i < data.length; i++) {
    const curr = data[i]
    const prev = data[i - 1]
    const filtPrev = filtered[i - 1]
    if (curr !== undefined && prev !== undefined && filtPrev !== undefined) {
      filtered[i] = alpha * (filtPrev + curr - prev)
    }
  }
  
  return filtered
}

/**
 * Find peaks in audio data with improved main beat detection
 * Uses adaptive thresholding and minimum peak spacing
 */
function findAudioPeaks(data: Float32Array, sampleRate: number): number[] {
  const peaks = []
  
  // Calculate RMS (root mean square) for adaptive threshold
  const rms = Math.sqrt(data.reduce((sum, val) => sum + val * val, 0) / data.length)
  const threshold = rms * 2 // Peaks must be 2x RMS to be considered
  
  // Minimum spacing between peaks (in samples)
  // For 60-200 BPM range, peaks should be at least 0.3 seconds apart (200 BPM = 0.3s between beats)
  const minPeakSpacing = Math.floor(sampleRate * 0.3) // 300ms minimum
  
  let lastPeakIndex = -minPeakSpacing
  
  // Find peaks with proper spacing
  for (let i = 0; i < data.length; i++) {
    const val = data[i]
    if (val === undefined) continue
    const sample = Math.abs(val)
    
    // Check if this could be a peak
    if (sample > threshold && (i - lastPeakIndex) >= minPeakSpacing) {
      // Look for local maximum in small window
      const windowSize = Math.floor(sampleRate * 0.05) // 50ms window
      const start = Math.max(0, i - windowSize)
      const end = Math.min(data.length, i + windowSize)
      
      let isLocalMax = true
      for (let j = start; j < end; j++) {
        const jVal = data[j]
        if (jVal !== undefined && Math.abs(jVal) > sample) {
          isLocalMax = false
          break
        }
      }
      
      if (isLocalMax) {
        peaks.push(i)
        lastPeakIndex = i
      }
    }
  }
  
  console.log(`Found ${peaks.length} peaks with min spacing ${minPeakSpacing} samples (${(minPeakSpacing/sampleRate).toFixed(3)}s)`)
  
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
      const specVal = spectrum[freq]
      if (specVal !== undefined && specVal > 0) {
        const hz = (freq * sampleRate) / chunkSize
        if (hz > 65 && hz < 2000) { // Focus on musical range
          const pitchClass = frequencyToPitchClass(hz)
          const chromaVal = chroma[pitchClass]
          if (chromaVal !== undefined) {
            chroma[pitchClass] = chromaVal + specVal
          }
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
    const val = data[i]
    if (val === undefined) continue
    const magnitude = Math.abs(val)
    const bin = Math.floor(i / 2)
    const binVal = spectrum[bin]
    if (bin < spectrum.length && binVal !== undefined) {
      spectrum[bin] = binVal + (magnitude * magnitude)
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
  return (majorThirdStrength !== undefined && minorThirdStrength !== undefined) 
    ? majorThirdStrength > minorThirdStrength 
    : true // Default to major if values are undefined
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


