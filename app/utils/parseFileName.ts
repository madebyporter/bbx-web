/**
 * Parse metadata from file names
 * Common patterns:
 * - "Art Dealer p2 - BPM150 - v2.mp3"
 * - "Artist Name - Track Title - 120BPM - v1.0.mp3"
 * - "Track Title BPM140 v3.mp3"
 */

export interface ParsedFileMetadata {
  bpm: number | null
  version: string | null
  artist: string | null
  title: string
}

/**
 * Extract BPM from filename
 * Matches: BPM150, 150BPM, 150 BPM, BPM 150
 */
export function extractBPM(filename: string): number | null {
  // Remove file extension first
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  
  // Match various BPM patterns
  const patterns = [
    /BPM\s*(\d{2,3})/i,    // BPM150, BPM 150
    /(\d{2,3})\s*BPM/i,    // 150BPM, 150 BPM
    /-\s*(\d{2,3})\s*-/,   // - 150 - (standalone number between dashes)
  ]
  
  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern)
    if (match && match[1]) {
      const bpm = parseInt(match[1])
      // Validate BPM range (typically 60-200 for music)
      if (bpm >= 60 && bpm <= 200) {
        return bpm
      }
    }
  }
  
  return null
}

/**
 * Extract version from filename
 * Matches: v2, v1.0, v2.5, V3
 */
export function extractVersion(filename: string): string | null {
  // Remove file extension first
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  
  // Match version patterns (case insensitive)
  const patterns = [
    /v(\d+(?:\.\d+)?)/i,        // v2, v1.0, v2.5
    /-\s*v\s*(\d+(?:\.\d+)?)/i, // - v2, - v 2
  ]
  
  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern)
    if (match && match[1]) {
      return `v${match[1]}`
    }
  }
  
  return null
}

/**
 * Extract artist name from filename (conservative approach)
 * Only extracts if there's a clear "Artist - Title" pattern with TWO substantial parts
 * 
 * Key insight: Files are named after songs, not artists. So we only extract artist
 * when there are clearly TWO distinct text elements (Artist AND Title).
 */
export function extractArtist(filename: string): string | null {
  // Remove file extension first
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  
  // First, strip BPM and version from the end to isolate the artist-title portion
  let cleaned = nameWithoutExt
  cleaned = cleaned.replace(/\s*-?\s*BPM\s*\d{2,3}\s*$/gi, '')
  cleaned = cleaned.replace(/\s*-?\s*\d{2,3}\s*BPM\s*$/gi, '')
  cleaned = cleaned.replace(/\s*-?\s*v\d+(?:\.\d+)?\s*$/i, '')
  cleaned = cleaned.trim()
  
  // Split by dash - only proceed if there are exactly 2 substantial parts
  const parts = cleaned.split(/\s*-\s*/)
  
  // We need exactly 2 parts (Artist - Title)
  if (parts.length !== 2) {
    return null // Either no dash (just title) or too many dashes (ambiguous)
  }
  
  const [part1, part2] = parts.map(p => p.trim())
  
  // Both parts must be substantial (at least 2 characters each)
  if (!part1 || !part2 || part1.length < 2 || part2.length < 2) {
    return null
  }
  
  // Skip if either part contains metadata markers (not actual names)
  const hasMetadata = (str: string) => 
    /BPM|v\d|version|mix|edit|remix|instrumental|acapella/i.test(str)
  
  if (hasMetadata(part1) || hasMetadata(part2)) {
    return null // e.g., "Song - BPM120" or "Mix v2 - Song"
  }
  
  // Check if part2 looks like a substantial song title (not just metadata)
  // A substantial title should have multiple words or be at least 5 characters
  const isSubstantialTitle = (str: string) => {
    const words = str.split(/\s+/)
    return words.length > 1 || str.length >= 5
  }
  
  // Only extract artist if the second part looks like a real song title
  if (!isSubstantialTitle(part2)) {
    return null // e.g., "Art Dealer - P2" → likely "Art Dealer P2" is the full title
  }
  
  // Heuristics for determining which part is the artist
  const part1HasNumbers = /\d/.test(part1)
  const part2HasNumbers = /\d/.test(part2)
  
  // If first part has no numbers and second has numbers, first is likely artist
  // Example: "Porter Robinson - 64 Bits" → "Porter Robinson"
  if (!part1HasNumbers && part2HasNumbers && part1.length < 40) {
    return part1
  }
  
  // If first part looks like a track number and second part has no numbers, second is artist
  // Example: "01 - Madeon" → "Madeon"
  // Track numbers: 01, 001, 1, Track 01, etc. (always < 60, since BPM doesn't go that low)
  const isTrackNumber = (str: string) => {
    const trackMatch = str.match(/^(track|song|demo)?\s*(\d+)$/i)
    if (!trackMatch) return false
    const num = parseInt(trackMatch[2])
    return num < 60 // Track numbers are typically 1-50, BPM is typically 60-200
  }
  
  if (isTrackNumber(part1) && !part2HasNumbers && part2.length < 40) {
    return part2
  }
  
  // If both have no numbers and both are substantial, assume "Artist - Title"
  // This is the most common convention: "Porter Robinson - Art Dealer"
  if (!part1HasNumbers && !part2HasNumbers && part1.length > 2 && part1.length < 40) {
    return part1
  }
  
  // Otherwise, too ambiguous - don't guess
  return null
}

/**
 * Clean title by removing metadata markers (BPM, version, etc.)
 */
export function cleanTitle(filename: string): string {
  // Remove file extension
  let cleaned = filename.replace(/\.[^/.]+$/, '')
  
  // Remove BPM markers
  cleaned = cleaned.replace(/\s*-?\s*BPM\s*\d{2,3}\s*-?\s*/gi, ' ')
  cleaned = cleaned.replace(/\s*-?\s*\d{2,3}\s*BPM\s*-?\s*/gi, ' ')
  
  // Remove version markers
  cleaned = cleaned.replace(/\s*-?\s*v\d+(?:\.\d+)?\s*$/i, '')
  
  // Remove extra dashes and whitespace
  cleaned = cleaned.replace(/\s*-\s*$/, '') // trailing dash
  cleaned = cleaned.replace(/\s+/g, ' ')    // multiple spaces
  cleaned = cleaned.trim()
  
  return cleaned
}

/**
 * Parse all metadata from filename
 */
export function parseFileName(filename: string): ParsedFileMetadata {
  const bpm = extractBPM(filename)
  const version = extractVersion(filename)
  const artist = extractArtist(filename)
  const title = cleanTitle(filename)
  
  return {
    bpm,
    version,
    artist,
    title
  }
}

