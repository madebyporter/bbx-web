export type ProfilePanels = {
  bio: boolean
  collections: boolean
  software: boolean
  music: boolean
}

export const DEFAULT_PROFILE_PANELS: ProfilePanels = {
  bio: false,
  collections: false,
  software: false,
  music: true,
}

export function normalizeProfilePanels(value: unknown): ProfilePanels {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    bio: raw.bio === true,
    collections: raw.collections === true,
    software: raw.software === true,
    music: raw.music !== false,
  }
}

function panelOpenStorageKey(profileId: string): string {
  return `profilePanelOpen_${profileId}`
}

export function loadStoredPanelOpenState(profileId: string): ProfilePanels | null {
  if (typeof window === 'undefined' || !profileId) return null
  try {
    const saved = localStorage.getItem(panelOpenStorageKey(profileId))
    if (!saved) return null
    return normalizeProfilePanels(JSON.parse(saved))
  } catch {
    return null
  }
}

export function saveStoredPanelOpenState(profileId: string, state: ProfilePanels): void {
  if (typeof window === 'undefined' || !profileId) return
  try {
    localStorage.setItem(panelOpenStorageKey(profileId), JSON.stringify(normalizeProfilePanels(state)))
  } catch (error) {
    console.error('Error saving panel open state:', error)
  }
}
