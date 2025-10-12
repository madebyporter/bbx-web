/**
 * Extract metadata from MP3 files using ID3 tags
 * This reads the actual metadata embedded in the MP3 file
 */

export interface MP3Metadata {
  title: string | null
  artist: string | null
  album: string | null
  year: number | null
  genre: string | null
  comment: string | null
  track: number | null
}

/**
 * Extract ID3 tags from MP3 file
 * Uses music-metadata library to read MP3 metadata
 * Must be called client-side only
 */
export async function extractMP3Metadata(file: File): Promise<MP3Metadata | null> {
  // Only run in browser
  if (typeof window === 'undefined') {
    return null
  }
  
  try {
    // Dynamically import music-metadata
    const { parseBlob } = await import('music-metadata')
    
    // Parse the file
    const metadata = await parseBlob(file)
    const common = metadata.common
    
    // Parse year from date field
    let year: number | null = null
    if (common.year) {
      year = common.year
    } else if (common.date) {
      const yearMatch = String(common.date).match(/(\d{4})/)
      if (yearMatch) {
        year = parseInt(yearMatch[1])
      }
    }
    
    // Get track number (could be {no: 1, of: 12} format)
    let trackNumber: number | null = null
    if (common.track?.no) {
      trackNumber = common.track.no
    }
    
    // Get genre (could be array)
    let genre: string | null = null
    if (common.genre && common.genre.length > 0) {
      genre = Array.isArray(common.genre) ? common.genre[0] : common.genre
    }
    
    return {
      title: common.title || null,
      artist: common.artist || null,
      album: common.album || null,
      year: year,
      genre: genre,
      comment: common.comment?.[0] || null,
      track: trackNumber
    }
  } catch (error) {
    console.warn('Failed to read MP3 tags:', error)
    return null // Don't throw, just return null
  }
}

/**
 * Merge MP3 metadata with filename-parsed metadata
 * Priority: MP3 tags > Filename parsing > Defaults
 */
export function mergeMetadata(
  mp3Meta: MP3Metadata | null,
  filenameMeta: { title: string; artist: string | null; bpm: number | null; version: string | null }
): {
  title: string
  artist: string
  year: number | null
  genre: string
  bpm: number | null
  version: string
  album: string | null
} {
  return {
    // Title: Prefer filename (usually more descriptive) over MP3 tag
    title: filenameMeta.title || mp3Meta?.title || 'Untitled',
    
    // Artist: Prefer MP3 tag (more reliable) over filename
    artist: mp3Meta?.artist || filenameMeta.artist || '',
    
    // Year: Only available from MP3 tags
    year: mp3Meta?.year || null,
    
    // Genre: Only available from MP3 tags
    genre: mp3Meta?.genre || '',
    
    // BPM: Only from filename (not typically in ID3 tags)
    bpm: filenameMeta.bpm || null,
    
    // Version: Only from filename
    version: filenameMeta.version || 'v1.0',
    
    // Album: Only from MP3 tags (could be used for collections?)
    album: mp3Meta?.album || null
  }
}

