import {
  generateResourceDescription,
  hasOpenAiKey,
  optimizeResourceDescription,
} from './optimizeResourceDescription'
import {
  extractDescriptionFromHtml,
  readHtmlForMeta,
  validateMetaDescriptionUrl,
  type FetchMetaDescriptionOptions,
} from './fetchMetaDescription'

const FETCH_TIMEOUT_MS = 10_000

export type ResolveResourceDescriptionResult =
  | { description: string; source: 'meta' | 'meta-optimized' | 'generated' }
  | { description: null; error: string }

export interface ResolveResourceDescriptionOptions extends FetchMetaDescriptionOptions {
  /** When true (default), generate from name/creator if meta scrape fails */
  generateIfMissing?: boolean
  price?: string
}

export async function resolveResourceDescription(
  rawUrl: string | null | undefined,
  options: ResolveResourceDescriptionOptions = {}
): Promise<ResolveResourceDescriptionResult> {
  const context = {
    name: options.name,
    creator: options.creator,
    tags: options.tags,
    price: options.price,
  }

  if (rawUrl?.trim()) {
    const scraped = await scrapeMetaDescription(rawUrl, options)
    if (scraped.description) {
      return scraped
    }
  }

  const shouldGenerate = options.generateIfMissing !== false
  if (!shouldGenerate || !context.name?.trim()) {
    return {
      description: null,
      error: rawUrl?.trim()
        ? 'No meta description found on page'
        : 'No link URL and no product name for generation',
    }
  }

  if (!hasOpenAiKey()) {
    return {
      description: null,
      error: 'No meta description found and OPENAI_API_KEY is not configured',
    }
  }

  const generated = await generateResourceDescription(context)
  if (!generated) {
    return { description: null, error: 'Failed to generate description' }
  }

  return { description: generated, source: 'generated' }
}

async function scrapeMetaDescription(
  rawUrl: string,
  options: ResolveResourceDescriptionOptions
): Promise<ResolveResourceDescriptionResult> {
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

    const html = await readHtmlForMeta(response)
    const rawDescription = extractDescriptionFromHtml(html)

    if (!rawDescription) {
      return { description: null, error: 'No meta description found on page' }
    }

    if (options.optimize === false) {
      return { description: rawDescription, source: 'meta' }
    }

    const optimized = await optimizeResourceDescription({
      rawDescription,
      name: options.name,
      creator: options.creator,
      tags: options.tags,
      price: options.price,
    })

    const description = optimized || rawDescription
    const wasOptimized = hasOpenAiKey() && optimized !== rawDescription

    return {
      description,
      source: wasOptimized ? 'meta-optimized' : 'meta',
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch URL'
    return { description: null, error: message }
  }
}
