/**
 * Audio Analysis Composable
 * Provides functionality to analyze audio files and detect BPM and Key
 */

import { ref } from 'vue'

// Cache the Tone.js instance
let toneLoaded = false
let loadingPromise: Promise<void> | null = null

// Cache the Essentia.js instance
let essentiaLoaded = false
let essentiaLoadingPromise: Promise<void> | null = null
let Essentia: any = null
let EssentiaWASMBackend: any = null // Keep WASM backend alive to prevent garbage collection
let EssentiaClass: any = null // Store the Essentia class for creating fresh instances

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
 * Dynamically load Essentia.js
 */
async function loadEssentia(): Promise<void> {
  // Return if already loaded
  if (essentiaLoaded && Essentia) {
    return
  }
  
  // Return existing loading promise if currently loading
  if (essentiaLoadingPromise) {
    return essentiaLoadingPromise
  }
  
  essentiaLoadingPromise = new Promise<void>(async (resolve, reject) => {
    try {
      console.log('Loading Essentia.js...')
      
      // Try importing from the main package entry point
      // The package uses UMD/CommonJS so we'll load it as a whole module
      const essentiaModule = await import('essentia.js')
      
      console.log('Essentia module:', essentiaModule)
      console.log('Available exports:', Object.keys(essentiaModule))
      
      // Get the exports - check for both named and default exports
      const { Essentia: EssentiaClassExport, EssentiaWASM: EssentiaWASMModule } = essentiaModule as any
      
      // Store the class for creating fresh instances later
      EssentiaClass = EssentiaClassExport
      
      if (!EssentiaClass) {
        console.error('Essentia not found. Exports:', essentiaModule)
        throw new Error('Essentia class not found in module. Available exports: ' + Object.keys(essentiaModule).join(', '))
      }
      
      if (!EssentiaWASMModule) {
        console.error('EssentiaWASM not found. Exports:', essentiaModule)
        throw new Error('EssentiaWASM not found in module. Available exports: ' + Object.keys(essentiaModule).join(', '))
      }
      
      console.log('Initializing WASM module...')
      console.log('EssentiaWASM type:', typeof EssentiaWASMModule)
      console.log('EssentiaWASM keys:', Object.keys(EssentiaWASMModule))
      
      // EssentiaWASM is typically a function that returns a Promise
      // But it might already be the module or need different initialization
      let wasmBackend
      if (typeof EssentiaWASMModule === 'function') {
        // It's a factory function, call it to get the WASM module
        console.log('Calling EssentiaWASM() to initialize...')
        wasmBackend = await EssentiaWASMModule()
      } else if (EssentiaWASMModule.then) {
        // It's a Promise, await it
        console.log('Awaiting EssentiaWASM promise...')
        wasmBackend = await EssentiaWASMModule
      } else {
        // It's already the WASM module
        console.log('Using EssentiaWASM directly...')
        wasmBackend = EssentiaWASMModule
      }
      
      console.log('WASM backend:', wasmBackend)
      console.log('WASM backend type:', typeof wasmBackend)
      console.log('WASM backend keys:', wasmBackend ? Object.keys(wasmBackend) : 'null')
      
      // The WASM module might be nested - extract it if needed
      let actualWasmModule = wasmBackend
      if (wasmBackend && typeof wasmBackend === 'object' && wasmBackend.EssentiaWASM) {
        console.log('Extracting nested EssentiaWASM property...')
        actualWasmModule = wasmBackend.EssentiaWASM
        console.log('Actual WASM module:', actualWasmModule)
        console.log('Actual WASM module type:', typeof actualWasmModule)
      }
      
      // If it's a function, we need to call it to initialize the WASM
      if (typeof actualWasmModule === 'function') {
        console.log('WASM module is a function, calling it to initialize...')
        actualWasmModule = await actualWasmModule()
        console.log('WASM module initialized:', actualWasmModule)
      }
      
      // Store the WASM backend to keep it alive (prevent garbage collection)
      EssentiaWASMBackend = actualWasmModule
      
      console.log('Creating Essentia instance with WASM backend...')
      console.log('Final WASM module type:', typeof actualWasmModule)
      console.log('Final WASM module keys:', actualWasmModule ? Object.keys(actualWasmModule).slice(0, 10) : 'null')
      
      // Create Essentia instance with the initialized WASM backend
      Essentia = new EssentiaClass(EssentiaWASMBackend)
      
      console.log('Essentia instance created successfully')
      console.log('Checking if instance is valid...')
      console.log('Essentia has KeyExtractor?', typeof Essentia.KeyExtractor === 'function')
      console.log('WASM backend reference stored:', !!EssentiaWASMBackend)
      
      // Give it a moment to fully initialize
      await new Promise(resolve => setTimeout(resolve, 200))
      
      console.log('✓ Essentia.js loaded and initialized successfully')
      console.log('✓ Essentia instance:', Essentia)
      essentiaLoaded = true
      resolve()
    } catch (error) {
      console.error('Failed to load Essentia.js:', error)
      essentiaLoadingPromise = null
      Essentia = null
      reject(new Error(`Failed to load key analysis library: ${error}`))
    }
  })
  
  return essentiaLoadingPromise
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
 * Analyze musical key of an audio file using Essentia.js
 * @param audioFile - File or Blob object containing audio data
 * @returns Promise<string> - Detected musical key (e.g., "C Major", "A Minor")
 */
export async function analyzeKey(audioFile: File | Blob): Promise<string> {
  try {
    // Load Essentia.js if not already loaded
    await loadEssentia()
    
    if (!Essentia) {
      throw new Error('Essentia.js not initialized')
    }
    
    // Create audio context for decoding
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Read file as array buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    console.log('Audio decoded for key detection:', audioBuffer.duration, 'seconds')
    
    // Limit to first 60 seconds for key analysis (Essentia works better with shorter samples)
    const maxDuration = 60
    const limitedDuration = Math.min(audioBuffer.duration, maxDuration)
    
    console.log('Analyzing key from first', limitedDuration, 'seconds')
    
    // Get mono channel data (mix down if stereo)
    let audioData: Float32Array
    if (audioBuffer.numberOfChannels === 1) {
      audioData = audioBuffer.getChannelData(0)
    } else {
      // Mix stereo to mono
      const left = audioBuffer.getChannelData(0)
      const right = audioBuffer.getChannelData(1)
      audioData = new Float32Array(left.length)
      for (let i = 0; i < left.length; i++) {
        audioData[i] = (left[i] + right[i]) / 2
      }
    }
    
    const maxSamples = audioBuffer.sampleRate * maxDuration
    const limitedAudioData = audioData.length > maxSamples 
      ? audioData.slice(0, maxSamples) 
      : audioData
    
    // Detect key using Essentia.js
    const key = detectKeyWithEssentia(limitedAudioData, audioBuffer.sampleRate)
    
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
 * Detect musical key from audio data using Essentia.js KeyExtractor
 */
function detectKeyWithEssentia(audioData: Float32Array, sampleRate: number): string {
  if (!EssentiaWASMBackend) {
    throw new Error('Essentia WASM backend not initialized')
  }
  
  console.log('Detecting key with Essentia.js:', audioData.length, 'samples at', sampleRate, 'Hz')
  
  try {
    if (!EssentiaClass) {
      throw new Error('Essentia class not available - initialization may have failed')
    }
    
    // Create a FRESH Essentia instance for this analysis to avoid state issues
    console.log('Creating fresh Essentia instance for this analysis...')
    const essentiaInstance = new EssentiaClass(EssentiaWASMBackend)
    
    console.log('Fresh Essentia instance created')
    console.log('Instance has KeyExtractor?', typeof essentiaInstance.KeyExtractor === 'function')
    
    // Convert Float32Array to vector format expected by Essentia
    console.log('Converting audio to vector...')
    const audioVector = essentiaInstance.arrayToVector(audioData)
    console.log('Audio vector created:', audioVector)
    
    console.log('Calling KeyExtractor...')
    // Use Essentia's KeyExtractor algorithm
    const keyData = essentiaInstance.KeyExtractor(
      audioVector,
      true,         // averageDetuningCorrection
      4096,         // frameSize
      2048,         // hopSize
      12,           // hpcpSize
      5000,         // maxFrequency
      100,          // maximumSpectralPeaks
      25,           // minFrequency
      0.2,          // pcpThreshold
      'temperley',  // profileType
      sampleRate,   // sampleRate
      0.0001,       // spectralPeaksThreshold
      440,          // tuningFrequency
      'cosine',     // weightType
      'blackmanharris92' // windowType
    )
    
    console.log('KeyExtractor result:', keyData)
    
    // KeyExtractor returns { key, scale, strength }
    const detectedKey = keyData.key
    const detectedScale = keyData.scale
    const strength = keyData.strength
    
    console.log(`Essentia detected: ${detectedKey} ${detectedScale} (strength: ${strength.toFixed(3)})`)
    
    // Format the output to match our expected format (e.g., "C Major", "A Minor")
    const formattedScale = detectedScale.charAt(0).toUpperCase() + detectedScale.slice(1)
    const result = `${detectedKey} ${formattedScale}`
    
    // Clean up the vector
    if (typeof essentiaInstance.delete === 'function') {
      try {
        essentiaInstance.delete(audioVector)
      } catch (cleanupError) {
        console.warn('Could not delete audio vector, continuing anyway:', cleanupError)
      }
    }
    
    return result
    
  } catch (error) {
    console.error('Essentia key detection error:', error)
    console.error('Error details:', {
      name: (error as any).name,
      message: (error as any).message,
      stack: (error as any).stack
    })
    throw new Error('Key detection failed with Essentia: ' + (error as any).message)
  }
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


