const PRODUCTION_ORIGIN = 'https://beatbox.studio'

function isLocalHost(host: string) {
  return host.includes('localhost') || host.includes('127.0.0.1')
}

function isProductionHost(host: string) {
  return host === 'beatbox.studio' || host === 'www.beatbox.studio'
}

/**
 * Origin for canonical URLs, og:url, and JSON-LD.
 * Always prefers beatbox.studio in production so crawlers on the custom domain
 * do not inherit a Netlify preview URL from SITE_URL.
 */
export function useSiteOrigin(): string {
  if (import.meta.server) {
    try {
      const { origin, host } = useRequestURL()
      if (isProductionHost(host) || isLocalHost(host)) {
        return origin
      }
    } catch {
      // fall through to production origin
    }
  }

  if (import.meta.client && typeof window !== 'undefined') {
    const host = window.location.host
    if (isProductionHost(host) || isLocalHost(host)) {
      return window.location.origin
    }
  }

  return PRODUCTION_ORIGIN
}
