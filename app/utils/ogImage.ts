/**
 * Static OG asset host.
 * Custom domain (beatbox.studio) is Cloudflare-proxied; X's image crawler often
 * fails there while HTML meta still works — producing the gray-icon summary card.
 * Netlify's *.netlify.app origin serves the same file without Cloudflare.
 */
export const OG_IMAGE_ASSET_ORIGIN = 'https://beatboxstudio.netlify.app'

export const DEFAULT_OG_IMAGE_TYPE = 'image/png'

/**
 * Absolute default Open Graph / Twitter card image URL.
 * Served from Netlify origin so Twitterbot is not blocked by Cloudflare.
 */
export function getDefaultOgImageUrl(_siteOrigin?: string): string {
  return `${OG_IMAGE_ASSET_ORIGIN}/og.png`
}
