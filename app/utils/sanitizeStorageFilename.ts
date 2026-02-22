/**
 * Sanitize a filename for use in Supabase Storage object keys.
 * Keeps extension and replaces spaces/special chars to avoid InvalidKey (400) errors.
 */
export function sanitizeStorageFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'audio'
  const lastDot = filename.lastIndexOf('.')
  const base = lastDot > 0 ? filename.slice(0, lastDot) : filename
  const ext = lastDot > 0 ? filename.slice(lastDot).toLowerCase() : ''
  // Allow only alphanumeric, hyphen, underscore, dot; replace everything else with hyphen
  const safe = base
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const name = safe || 'audio'
  return name + ext
}
