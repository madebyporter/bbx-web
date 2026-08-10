export type MarkdownRoute =
  | { type: 'landing' }
  | { type: 'resource'; kind: 'software' | 'kits'; slug: string }
  | { type: 'producer'; id: string }

/** Normalize pathname (no query, no trailing slash except root). */
export function normalizePath(pathname: string): string {
  const path = pathname.split('?')[0] ?? '/'
  if (path === '/') return '/'
  return path.replace(/\/$/, '')
}

/**
 * Match scoped routes that support markdown negotiation.
 * Producer library: `/u/:id` only — not collection/track/group subpaths.
 */
export function matchMarkdownRoute(pathname: string): MarkdownRoute | null {
  const path = normalizePath(pathname)

  if (path === '/') {
    return { type: 'landing' }
  }

  const softwareMatch = path.match(/^\/software\/([^/]+)$/)
  if (softwareMatch?.[1]) {
    return { type: 'resource', kind: 'software', slug: decodeURIComponent(softwareMatch[1]) }
  }

  const kitsMatch = path.match(/^\/kits\/([^/]+)$/)
  if (kitsMatch?.[1]) {
    return { type: 'resource', kind: 'kits', slug: decodeURIComponent(kitsMatch[1]) }
  }

  const producerMatch = path.match(/^\/u\/([^/]+)$/)
  if (producerMatch?.[1]) {
    return { type: 'producer', id: decodeURIComponent(producerMatch[1]) }
  }

  return null
}
