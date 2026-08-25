/** Cache-bust query so social crawlers refetch after a failed/stale image scrape. */
export const DEFAULT_OG_IMAGE_VERSION = '20260824'

export const DEFAULT_OG_IMAGE_TYPE = 'image/jpeg'

/**
 * Absolute default Open Graph / Twitter card image URL.
 * Bump DEFAULT_OG_IMAGE_VERSION when the asset changes or crawlers need a fresh fetch.
 */
export function getDefaultOgImageUrl(siteOrigin = 'https://beatbox.studio'): string {
  const base = siteOrigin.replace(/\/$/, '')
  return `${base}/img/og-image.jpg?v=${DEFAULT_OG_IMAGE_VERSION}`
}
