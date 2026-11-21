/**
 * Soft cap for cover direction prompts.
 * Keep in sync with server `MAX_COVER_DIRECTION_CHARS` in `server/utils/openaiCover.ts`.
 */
export const COVER_DIRECTION_MAX = 8000

/** Quick-add phrases for the Generate cover direction field. */
export const COVER_DIRECTION_CHIPS = [
  'No logos',
  'No people',
  'No text',
  'No watermark',
  'Minimal',
  'Dark cinematic',
] as const

export type CoverDirectionChip = (typeof COVER_DIRECTION_CHIPS)[number]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function isCoverDirectionChipActive(direction: string, chip: string): boolean {
  if (!direction.trim()) return false
  const re = new RegExp(`(?:^|[,\\n]\\s*)${escapeRegExp(chip)}(?=\\s*[,\\n]|$)`, 'i')
  return re.test(direction)
}

/** Toggle a chip phrase in the cover direction string. */
export function toggleCoverDirectionChip(direction: string, chip: string): string {
  const trimmed = direction.trim()
  if (isCoverDirectionChipActive(trimmed, chip)) {
    return trimmed
      .replace(new RegExp(`(^|[,\\n]\\s*)${escapeRegExp(chip)}(?=\\s*[,\\n]|$)`, 'gi'), '$1')
      .replace(/^[\s,\n]+|[\s,\n]+$/g, '')
      .replace(/,\s*,/g, ',')
      .replace(/\n{2,}/g, '\n')
      .trim()
  }
  if (!trimmed) return chip
  const needsComma = !/[,\n]\s*$/.test(trimmed)
  return needsComma ? `${trimmed}, ${chip}` : `${trimmed}${chip}`
}
