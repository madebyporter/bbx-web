/**
 * OG/Twitter card image hosted on jsDelivr (GitHub), not beatbox.studio.
 * Custom domain is Cloudflare-proxied; X often scrapes title/description but fails
 * the image fetch (gray placeholder). jsDelivr is crawler-friendly with CORP/CORS.
 */
export const OG_IMAGE_ASSET_ORIGIN = 'https://cdn.jsdelivr.net/gh/madebyporter/bbx-web@main'

export const DEFAULT_OG_IMAGE_TYPE = 'image/png'

/**
 * Absolute default Open Graph / Twitter card image URL.
 */
export function getDefaultOgImageUrl(_siteOrigin?: string): string {
  return `${OG_IMAGE_ASSET_ORIGIN}/public/og.png`
}
