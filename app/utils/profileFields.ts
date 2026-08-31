export const SOCIAL_PLATFORMS = [
  'twitter',
  'instagram',
  'soundcloud',
  'spotify',
  'youtube',
  'linkedin',
] as const

export type SocialLinkPlatform = (typeof SOCIAL_PLATFORMS)[number]

export type SocialLinks = Partial<Record<SocialLinkPlatform, string>>

const PLATFORM_DISPLAY_NAMES: Record<SocialLinkPlatform, string> = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
}

export function getPlatformDisplayName(platform: string): string {
  return PLATFORM_DISPLAY_NAMES[platform as SocialLinkPlatform] || platform
}

export function normalizeUsername(value: string): string {
  let normalized = value.trim().toLowerCase()
  if (normalized.startsWith('@')) {
    normalized = normalized.slice(1)
  }
  return normalized
}

export function validateUsername(value: string): string | null {
  const normalized = normalizeUsername(value)
  if (!normalized) {
    return 'Username cannot be empty'
  }
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens'
  }
  return null
}

export function normalizeUrl(value: string, options: { allowEmpty?: boolean } = {}): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'https://') {
    return options.allowEmpty ? '' : null
  }

  let url = trimmed
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }

  try {
    new URL(url)
    return url
  } catch {
    return null
  }
}

export function validateUrl(value: string, options: { allowEmpty?: boolean } = {}): string | null {
  const normalized = normalizeUrl(value, options)
  if (normalized === null) {
    return 'Please enter a valid URL'
  }
  return null
}

export function detectPlatformFromUrl(url: string): SocialLinkPlatform | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    const domainMap: Record<string, SocialLinkPlatform> = {
      'twitter.com': 'twitter',
      'x.com': 'twitter',
      'instagram.com': 'instagram',
      'soundcloud.com': 'soundcloud',
      'spotify.com': 'spotify',
      'youtube.com': 'youtube',
      'youtu.be': 'youtube',
      'linkedin.com': 'linkedin',
    }
    return domainMap[hostname] || null
  } catch {
    return null
  }
}

export function getDisplayNameFromUrl(url: string, fallbackPlatform?: string): string {
  const detectedPlatform = detectPlatformFromUrl(url)
  const platform = detectedPlatform || fallbackPlatform
  return platform ? getPlatformDisplayName(platform) : 'Link'
}

export function normalizeSocialLinks(links: SocialLinks | null | undefined): SocialLinks {
  const normalized: SocialLinks = {}
  for (const platform of SOCIAL_PLATFORMS) {
    const value = links?.[platform]?.trim()
    if (value) {
      normalized[platform] = value
    }
  }
  return normalized
}

export function getNextAvailableSocialPlatform(links: SocialLinks): SocialLinkPlatform | null {
  return SOCIAL_PLATFORMS.find((platform) => !links[platform]) || null
}

export function hasSocialLinks(links: SocialLinks | null | undefined): boolean {
  return SOCIAL_PLATFORMS.some((platform) => !!links?.[platform]?.trim())
}
