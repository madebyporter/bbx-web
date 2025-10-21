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
    
    if (groupTracks.length > 1) {
      console.log(`Group "${groupName}": selected v${bestTrack.version} (${bestTrack.title}) from ${groupTracks.length} tracks`)
    }
  }
  
  // Add all ungrouped tracks
  uniqueTracks.push(...ungroupedTracks)
  
  console.log(`Deduplication: ${tracks.length} tracks → ${uniqueTracks.length} unique (${groupMap.size} groups, ${ungroupedTracks.length} ungrouped)`)
  
  return uniqueTracks
}

/**
 * Smart shuffle algorithm that maximizes spacing between similar tracks
 * Uses track IDs and group names to ensure variety
 */
function smartShuffle(array: Track[]): Track[] {
  if (array.length <= 2) {
    return [...array]
  }
  
  // Create a copy and shuffle it randomly first
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  // Now improve the shuffle by spacing out tracks with same ID or group name
  const maxPasses = 5
  const minDistance = Math.max(3, Math.floor(shuffled.length / 8)) // At least 3 songs apart, or 12.5% of queue
  
  console.log(`Smart shuffle: ${shuffled.length} tracks, min distance: ${minDistance}`)
  
  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false
    
    for (let i = 0; i < shuffled.length; i++) {
      const currentTrack = shuffled[i]
      let tooClose = false
      let conflictPos = -1
      
      // Check surrounding positions for same track ID or group name
      for (let j = Math.max(0, i - minDistance); j <= Math.min(shuffled.length - 1, i + minDistance); j++) {
        if (i === j) continue
        
        const compareTrack = shuffled[j]
        
        // Check if it's the same track (by ID) or same group
        if (currentTrack.id === compareTrack.id ||
            (currentTrack.track_group_name && currentTrack.track_group_name === compareTrack.track_group_name)) {
          tooClose = true
          conflictPos = j
          break
        }
      }
      
      // If track is too close to similar track, try to move it
      if (tooClose) {
        // Find positions that are far from similar tracks
        const possiblePositions = []
        
        for (let newPos = 0; newPos < shuffled.length; newPos++) {
          if (Math.abs(newPos - i) < 2) continue // Don't move too close to current position
          
          let isFarEnough = true
          
          // Check if this position has no conflicts in surrounding area
          for (let checkPos = Math.max(0, newPos - minDistance); 
               checkPos <= Math.min(shuffled.length - 1, newPos + minDistance); 
               checkPos++) {
            if (checkPos === i) continue // Skip the track we're moving
            
            const checkTrack = shuffled[checkPos]
            
            if (currentTrack.id === checkTrack.id ||
                (currentTrack.track_group_name && currentTrack.track_group_name === checkTrack.track_group_name)) {
              isFarEnough = false
              break
            }
          }
          
          if (isFarEnough) {
            possiblePositions.push(newPos)
          }
        }
        
        // Move to a random valid position
        if (possiblePositions.length > 0) {
          const randomIndex = Math.floor(Math.random() * possiblePositions.length)
          const newPos = possiblePositions[randomIndex]
          
          // Remove from current position and insert at new position
          const [track] = shuffled.splice(i, 1)
          shuffled.splice(newPos, 0, track)
          
          improved = true
        }
      }
    }
    
    // If no improvements were made, we're done
    if (!improved) {
      console.log(`Smart shuffle: converged after ${pass + 1} passes`)
      break
    }
  }
  
  return shuffled
}

/**
 * Main function: Get unique group tracks and shuffle them intelligently
 * Returns a shuffled array where each track_group_name appears at most once
 * with its most updated version, and tracks are spaced evenly
 */
export function shuffleUniqueGroups(tracks: Track[]): Track[] {
  const uniqueTracks = getUniqueGroupTracks(tracks)
  return smartShuffle(uniqueTracks)
}

