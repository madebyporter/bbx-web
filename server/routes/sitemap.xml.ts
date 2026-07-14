import { createClient } from '@supabase/supabase-js'

const SITE_ORIGIN = 'https://beatbox.studio'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry(loc: string, lastmod?: string | null) {
  const datePart = lastmod ? lastmod.split('T')[0] ?? lastmod : ''
  const lastmodTag = datePart
    ? `\n    <lastmod>${escapeXml(datePart)}</lastmod>`
    : ''
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`
}

function readResourceTypeSlug(value: unknown): string | undefined {
  const resourceType = Array.isArray(value) ? value[0] : value
  if (
    typeof resourceType !== 'object' ||
    resourceType === null ||
    !('slug' in resourceType) ||
    typeof resourceType.slug !== 'string'
  ) {
    return undefined
  }

  return resourceType.slug
}

export default defineEventHandler(async (event) => {
  const staticRoutes = [
    '/',
    '/software',
    '/kits',
  ]

  const resourceRoutes: Array<{ loc: string; lastmod?: string | null }> = []

  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: resources } = await supabase
      .from('resources')
      .select('slug, created_at, resource_types(slug)')
      .eq('status', 'approved')

    resources?.forEach((resource) => {
      const typeSlug = readResourceTypeSlug(resource.resource_types)
      if (typeof resource.slug !== 'string' || resource.slug.length === 0) {
        return
      }

      const lastmod = typeof resource.created_at === 'string'
        ? resource.created_at
        : null
      if (typeSlug === 'software') {
        resourceRoutes.push({
          loc: `${SITE_ORIGIN}/software/${resource.slug}`,
          lastmod,
        })
      } else if (typeSlug === 'sounds') {
        resourceRoutes.push({
          loc: `${SITE_ORIGIN}/kits/${resource.slug}`,
          lastmod,
        })
      }
    })
  }

  const urls = [
    ...staticRoutes.map((path) => urlEntry(`${SITE_ORIGIN}${path}`)),
    ...resourceRoutes.map((route) => urlEntry(route.loc, route.lastmod)),
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=3600')

  return body
})
