const ALLOWED_ARTWORK_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
])

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

export function normalizeArtworkContentType(contentType: string, filename: string): string {
  const base = contentType.split(';')[0]?.trim().toLowerCase() || ''
  if (ALLOWED_ARTWORK_TYPES.has(base)) {
    return base
  }

  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return EXTENSION_TO_MIME[ext] || 'image/jpeg'
}

export function isAllowedArtworkContentType(contentType: string, filename: string): boolean {
  const normalized = normalizeArtworkContentType(contentType, filename)
  return ALLOWED_ARTWORK_TYPES.has(normalized)
}
