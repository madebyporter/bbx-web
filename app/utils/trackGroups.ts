/**
 * Track Grouping Utilities
 * Functions for automatically grouping similar tracks using fuzzy matching
 */

/**
 * Remove BPM indicators from title
 * "Art Dealer - BPM150 - v2" → "Art Dealer - v2"
 */
function stripBPM(title: string): string {
  return title.replace(/\s*-?\s*BPM\d+\s*-?\s*/gi, ' ').trim()
}

/**
 * Remove version indicators from title
 * "Art Dealer - v2" → "Art Dealer"
 */
function stripVersion(title: string): string {
  return title
    .replace(/\s*-\s*v[\d.]+$/i, '')
    .replace(/\s+v[\d.]+$/i, '')
    .trim()
}

/**
 * Normalize title for comparison (strip BPM, version, trim, lowercase)
 */
export function normalizeTitle(title: string): string {
  return stripVersion(stripBPM(title))
    .toLowerCase()
    .trim()
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[b.length][a.length]
}

/**
 * Calculate similarity ratio (0-1) between two strings
 */
export function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  
  const distance = levenshteinDistance(a, b)
  return 1 - distance / maxLen
}

/**
 * Generate URL-friendly group name from normalized title
 */
export function generateGroupName(title: string): string {
  return normalizeTitle(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Find similar tracks and suggest a group name
 * Returns existing group if found, or creates new group name
 */
export async function findOrCreateTrackGroup(
  supabase: any,
  userId: string,
  title: string,
  threshold: number = 0.85
): Promise<string> {
  const normalized = normalizeTitle(title)
  
  // Get all tracks for this user
  const { data: userTracks } = await supabase
    .from('sounds')
    .select('id, title, track_group_name')
    .eq('user_id', userId)
  
  if (!userTracks || userTracks.length === 0) {
    // First track for this user
    return generateGroupName(title)
  }
  
  // Find similar tracks using fuzzy matching
  let bestMatch: { track: any; ratio: number } | null = null
  
  for (const track of userTracks) {
    if (!track.title) continue
    
    const trackNormalized = normalizeTitle(track.title)
    const ratio = similarityRatio(normalized, trackNormalized)
    
    if (ratio >= threshold) {
      if (!bestMatch || ratio > bestMatch.ratio) {
        bestMatch = { track, ratio }
      }
    }
  }
  
  if (bestMatch && bestMatch.track.track_group_name) {
    // Found similar track with existing group
    console.log(`Track group match found: "${title}" → "${bestMatch.track.track_group_name}" (${Math.round(bestMatch.ratio * 100)}% similar)`)
    return bestMatch.track.track_group_name
  }
  
  // No similar tracks or no existing group, create new
  const newGroupName = generateGroupName(title)
  console.log(`Creating new track group: "${title}" → "${newGroupName}"`)
  return newGroupName
}

