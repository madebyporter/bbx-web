const MAX_DESCRIPTION_LENGTH = 500
const FETCH_TIMEOUT_MS = 10_000
const MAX_HTML_BYTES = 512_000

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
])

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function normalizeDescription(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH)
}

function extractMetaContent(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    const content = match?.[1]?.trim()
    if (content) return content
  }
  return null
}

function extractDescriptionFromHtml(html: string): string | null {
  const ogDescription = extractMetaContent(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["'][^>]*>/i,
  ])

  const twitterDescription = extractMetaContent(html, [
    /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:description["'][^>]*>/i,
  ])

  const metaDescription = extractMetaContent(html, [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ])

  const raw = ogDescription || twitterDescription || metaDescription
  if (!raw) return null

  const normalized = normalizeDescription(raw)
  return normalized || null
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(lower)) return true
  if (lower.endsWith('.local')) return true
  if (lower.startsWith('10.')) return true
  if (lower.startsWith('192.168.')) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true
  return false
}

export function validateMetaDescriptionUrl(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    throw new Error('Invalid URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported')
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('URL hostname is not allowed')
  }

  return parsed
}

export type FetchMetaDescriptionResult =
  | { description: string }
  | { description: null; error: string }

export async function fetchMetaDescription(rawUrl: string): Promise<FetchMetaDescriptionResult> {
  try {
    const parsed = validateMetaDescriptionUrl(rawUrl)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BeatboxBot/1.0 (+https://beatbox.studio)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return { description: null, error: `Request failed with status ${response.status}` }
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { description: null, error: 'URL did not return HTML' }
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_HTML_BYTES) {
      return { description: null, error: 'Response too large' }
    }

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    const description = extractDescriptionFromHtml(html)

    if (!description) {
      return { description: null, error: 'No meta description found on page' }
    }

    return { description }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch URL'
    return { description: null, error: message }
  }
}
