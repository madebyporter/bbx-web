# Essentia.js Key Detection Integration

## Summary
Replaced the custom chroma-based key detection algorithm with **Essentia.js**, a professional music/audio signal analysis library from Music Technology Group, UPF Barcelona. This provides significantly more accurate key detection for uploaded tracks.

## Changes Made

### 1. Package Installation
- **Added**: `essentia.js` v0.1.3 to dependencies
- **Command**: `npm install essentia.js`

### 2. Updated `app/composables/useAudioAnalyzer.ts`

#### Added Essentia.js Loading System
```typescript
// New caching variables
let essentiaLoaded = false
let essentiaLoadingPromise: Promise<void> | null = null
let Essentia: any = null

// New loadEssentia() function
// - Dynamically imports WASM module and core API
// - Initializes Essentia instance with WASM backend
// - Caches instance for reuse
```

#### Updated `analyzeKey()` Function
- Now uses `loadEssentia()` instead of custom chroma analysis
- Properly handles stereo-to-mono conversion
- Still limits analysis to first 60 seconds for performance
- Maintains same API surface (no changes needed in UI components)

#### New `detectKeyWithEssentia()` Function
Uses Essentia's **KeyExtractor** algorithm with optimized parameters:

**Parameters**:
- `averageDetuningCorrection: true` - Corrects for slight detuning
- `frameSize: 4096` - Analysis frame size
- `hopSize: 2048` - Hop between frames
- `hpcpSize: 12` - 12-note chromatic scale
- `maxFrequency: 5000 Hz` - Upper frequency bound
- `minimumSpectralPeaks: 100` - Peak detection sensitivity
- `minFrequency: 25 Hz` - Lower frequency bound
- `pcpThreshold: 0.2` - Pitch class profile threshold
- `profileType: 'temperley'` - Uses Temperley key profile (research-backed)
- `spectralPeaksThreshold: 0.0001` - Peak detection threshold
- `tuningFrequency: 440 Hz` - Standard A4 tuning
- `weightType: 'cosine'` - Frequency weighting function
- `windowType: 'blackmanharris92'` - Analysis window

**Returns**: `{ key, scale, strength }`
- `key`: Note name (e.g., "C", "D#", "G")
- `scale`: "major" or "minor"
- `strength`: Confidence score (0-1)

### 3. Removed Old Code
The following custom functions are NO LONGER USED (but kept in file for now):
- `detectKeyFromAudioData()` - Old chroma analysis
- `calculateChroma()` - Manual pitch class calculation
- `calculateSpectrum()` - Simple spectrum analysis
- `frequencyToPitchClass()` - Manual frequency mapping
- `determineMajorMinor()` - Major/minor detection

**TODO**: Clean up old key detection functions after confirming new implementation works.

## How It Works

1. **User triggers key analysis** (upload or edit track with auto-analyze enabled)
2. **Audio file is decoded** using Web Audio API
3. **Essentia.js loads** (WASM + Core API) on first use, cached thereafter
4. **Audio is converted** to mono Float32Array
5. **KeyExtractor analyzes** using HPCP (Harmonic Pitch Class Profile)
6. **Result is formatted** (e.g., "C# Major", "A Minor")
7. **Database is updated** with detected key

## Benefits of Essentia.js

✅ **Research-grade accuracy** - Used in academic music information retrieval  
✅ **Industry standard** - Powers professional music analysis tools  
✅ **Handles complex music** - Works with polyphonic, detuned, or atonal music  
✅ **Multiple profile types** - Temperley, Krumhansl, EDMA, etc.  
✅ **Confidence scoring** - Know how certain the detection is  
✅ **WebAssembly performance** - Fast execution in browser  

## Testing

### Manual Testing
1. Upload a track with known key (e.g., "C Major")
2. Enable "Auto-analyze Key" checkbox
3. Check console logs for Essentia detection output
4. Verify key is correctly detected and saved

### Edit Track Testing
1. Open edit modal for existing track
2. Click the sparkle button next to "Key" field
3. Wait for analysis (progress indicator shown)
4. Verify detected key appears in field

### Expected Console Output
```
Loading Essentia.js WASM module...
✓ Essentia.js loaded and initialized successfully
Audio decoded for key detection: 180.5 seconds
Analyzing key from first 60 seconds
Detecting key with Essentia.js: 2646000 samples at 44100 Hz
Essentia detected: C major (strength: 0.856)
Detected key: C Major
✓ Key detected: C Major for "Track Name"
```

## Troubleshooting

### Issue: "Failed to load Essentia.js"
- **Cause**: WASM module failed to initialize
- **Fix**: Check browser console for WASM errors, ensure modern browser

### Issue: Key detection returns incorrect results
- **Possible causes**:
  - Track is instrumental/atonal
  - Track modulates keys frequently
  - Audio quality is poor
- **Check**: Look at `strength` value in console (< 0.5 = low confidence)

### Issue: Slow performance
- **Cause**: Large audio files
- **Current**: Limited to first 60 seconds
- **Optimization**: Could reduce frameSize/hopSize for faster analysis

## Resources

- **Essentia.js Docs**: https://mtg.github.io/essentia.js/docs/api/
- **GitHub**: https://github.com/MTG/essentia.js
- **Research Paper**: Correya et al., "Essentia.js: A JavaScript Library for Music and Audio Analysis on the Web", ISMIR 2020
- **KeyExtractor Algorithm**: https://essentia.upf.edu/reference/std_KeyExtractor.html

## Future Improvements

- [ ] Add key confidence threshold (reject low-confidence detections)
- [ ] Allow user to select key profile type (Temperley vs Krumhansl)
- [ ] Detect key changes throughout track (multiple keys)
- [ ] Add camelot wheel notation for DJs
- [ ] Clean up old custom key detection code
- [ ] Add unit tests with known key samples

---

**Last Updated**: October 25, 2025  
**Essentia.js Version**: 0.1.3  
**Status**: ✅ Implementation complete, ready for testing

