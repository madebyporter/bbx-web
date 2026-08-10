const MAX_DESCRIPTION_LENGTH = 500
const FETCH_TIMEOUT_MS = 10_000
/** Only read enough HTML to capture <head> meta tags; avoids "response too large" on heavy pages */
const HEAD_SCAN_BYTES = 256_000

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

export function extractDescriptionFromHtml(html: string): string | null {
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

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}

export async function readHtmlForMeta(response: Response): Promise<string> {
  if (!response.body) {
    const buffer = await response.arrayBuffer()
    const slice = buffer.byteLength > HEAD_SCAN_BYTES
      ? buffer.slice(0, HEAD_SCAN_BYTES)
      : buffer
    return new TextDecoder('utf-8', { fatal: false }).decode(slice)
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (totalBytes < HEAD_SCAN_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value?.byteLength) continue

      chunks.push(value)
      totalBytes += value.byteLength

      const partialHtml = new TextDecoder('utf-8', { fatal: false }).decode(concatChunks(chunks))
      if (partialHtml.includes('</head>')) {
        break
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
  }

  const merged = concatChunks(chunks)
  const capped = merged.byteLength > HEAD_SCAN_BYTES
    ? merged.slice(0, HEAD_SCAN_BYTES)
    : merged

  return new TextDecoder('utf-8', { fatal: false }).decode(capped)
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

export interface FetchMetaDescriptionOptions {
  name?: string
  creator?: string
  tags?: string[]
  price?: string
  optimize?: boolean
  generateIfMissing?: boolean
}

export type FetchMetaDescriptionResult =
  | { description: string; source: 'meta' | 'meta-optimized' | 'generated' }
  | { description: null; error: string }

export async function fetchMetaDescription(
  rawUrl: string,
  options: FetchMetaDescriptionOptions = {}
): Promise<FetchMetaDescriptionResult> {
  const { resolveResourceDescription } = await import('./resolveResourceDescription')
  return resolveResourceDescription(rawUrl, options)
}
