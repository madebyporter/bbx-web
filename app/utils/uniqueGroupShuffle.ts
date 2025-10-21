/**
 * Unique Group Shuffle Utilities
 * Functions for deduplicating tracks by group_name and selecting the most updated version
 */

import type { Track } from '~/composables/usePlayer'

/**
 * Parse version string to number for comparison
 * "v1.0" → 1.0, "v2.5" → 2.5, "1.0" → 1.0
 * Returns null if version can't be parsed
 */
function parseVersion(version: string | undefined | null): number | null {
  if (!version) return null
  
  // Remove 'v' prefix if present and extract number
  const cleaned = version.toLowerCase().replace(/^v/, '').trim()
  const parsed = parseFloat(cleaned)
  
  return isNaN(parsed) ? null : parsed
}

/**
 * Selects the most updated track from a group of tracks
 * Priority: Highest version number, then most recent created_at
 */
export function selectMostUpdatedTrack(tracks: Track[]): Track {
  if (tracks.length === 0) {
    throw new Error('Cannot select from empty array')
  }
  
  if (tracks.length === 1) {
    return tracks[0]
  }
  
  // Try to find the track with the highest version number
  let bestTrack = tracks[0]
  let bestVersion = parseVersion(bestTrack.version)
  
  for (let i = 1; i < tracks.length; i++) {
    const currentTrack = tracks[i]
    const currentVersion = parseVersion(currentTrack.version)
    
    // Compare versions if both are valid
    if (bestVersion !== null && currentVersion !== null) {
      if (currentVersion > bestVersion) {
        bestTrack = currentTrack
        bestVersion = currentVersion
      } else if (currentVersion === bestVersion) {
        // If versions are equal, use created_at as tiebreaker
        const bestDate = new Date(bestTrack.created_at || 0).getTime()
        const currentDate = new Date(currentTrack.created_at || 0).getTime()
        if (currentDate > bestDate) {
          bestTrack = currentTrack
          bestVersion = currentVersion
        }
      }
    } else if (currentVersion !== null && bestVersion === null) {
      // Current has version, best doesn't - prefer current
      bestTrack = currentTrack
      bestVersion = currentVersion
    } else if (currentVersion === null && bestVersion === null) {
      // Neither has version - use created_at
      const bestDate = new Date(bestTrack.created_at || 0).getTime()
      const currentDate = new Date(currentTrack.created_at || 0).getTime()
      if (currentDate > bestDate) {
        bestTrack = currentTrack
      }
    }
    // If best has version but current doesn't, keep best
  }
  
  return bestTrack
}

/**
 * Groups tracks by track_group_name and selects the most updated from each group
 * Tracks without track_group_name are treated as unique and all included
 */
export function getUniqueGroupTracks(tracks: Track[]): Track[] {
  const groupMap = new Map<string, Track[]>()
  const ungroupedTracks: Track[] = []
  
  // Group tracks by track_group_name
  for (const track of tracks) {
    if (track.track_group_name) {
      const groupName = track.track_group_name
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, [])
      }
      groupMap.get(groupName)!.push(track)
    } else {
      // Tracks without group_name are treated as unique
      ungroupedTracks.push(track)
    }
  }
  
  // Select the most updated track from each group
  const uniqueTracks: Track[] = []
  
  for (const [groupName, groupTracks] of groupMap.entries()) {
    const bestTrack = selectMostUpdatedTrack(groupTracks)
    uniqueTracks.push(bestTrack)
  }
  
  // Add all ungrouped tracks
  uniqueTracks.push(...ungroupedTracks)
  
  return uniqueTracks
}

/**
 * Shuffle array helper (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Main function: Get unique group tracks and shuffle them
 * Returns a shuffled array where each track_group_name appears at most once
 * with its most updated version
 */
export function shuffleUniqueGroups(tracks: Track[]): Track[] {
  const uniqueTracks = getUniqueGroupTracks(tracks)
  return shuffleArray(uniqueTracks)
}

