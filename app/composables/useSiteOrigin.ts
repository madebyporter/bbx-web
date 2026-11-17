export const PRODUCTION_ORIGIN = 'https://beatbox.studio'

function isLocalHost(host: string) {
  return host.includes('localhost') || host.includes('127.0.0.1')
}

function isProductionHost(host: string) {
  return host === 'beatbox.studio' || host === 'www.beatbox.studio'
}

function isLocalOrigin(origin: string) {
  try {
    return isLocalHost(new URL(origin).host)
  } catch {
    return origin.includes('localhost') || origin.includes('127.0.0.1')
  }
}

/**
 * Origin for canonical URLs, og:url, and JSON-LD.
 * Always prefers beatbox.studio in production so crawlers on the custom domain
 * do not inherit a Netlify preview URL from SITE_URL.
 */
export function useSiteOrigin(): string {
  if (import.meta.server) {
    try {
      const { host } = useRequestURL()
      if (isProductionHost(host)) {
        return PRODUCTION_ORIGIN
      }
      if (isLocalHost(host)) {
        return useRequestURL().origin
      }
    } catch {
      // fall through to production origin
    }
  }

  if (import.meta.client && typeof window !== 'undefined') {
    const host = window.location.host
    if (isProductionHost(host)) {
      return PRODUCTION_ORIGIN
    }
    if (isLocalHost(host)) {
      return window.location.origin
    }
  }

  return PRODUCTION_ORIGIN
}

/**
 * Public site origin for links published to third parties (YouTube, SoundCloud, etc.).
 * Never returns localhost — local Sync tests still write beatbox.studio URLs.
 */
export function usePublishSiteOrigin(): string {
  const config = useRuntimeConfig()
  const configured = String(config.public.SITE_URL || '')
    .trim()
    .replace(/\/$/, '')

  if (configured && !isLocalOrigin(configured)) {
    return configured
  }

  return PRODUCTION_ORIGIN
}
