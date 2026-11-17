import type { Track } from '~/types/track'

function trimOrEmpty(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function moodTags(mood: unknown): string[] {
  if (Array.isArray(mood)) {
    return mood.map((m) => trimOrEmpty(m)).filter(Boolean)
  }
  const raw = trimOrEmpty(mood)
  if (!raw) return []
  return raw
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
}

export interface YouTubeUploadSnippet {
  title: string
  description: string
  tags: string[]
  privacyStatus: 'unlisted' | 'private' | 'public'
}

export function buildYouTubeDescription(
  track: Partial<Track>,
  trackUrl?: string | null,
): string {
  const lines: string[] = []
  const artist = trimOrEmpty(track.artist)
  const genre = trimOrEmpty(track.genre)
  const key = trimOrEmpty(track.key)
  const bpm =
    track.bpm != null && Number.isFinite(Number(track.bpm))
      ? Math.round(Number(track.bpm))
      : null
  const moods = moodTags(track.mood)

  if (artist) lines.push(`Artist: ${artist}`)
  if (genre) lines.push(`Genre: ${genre}`)
  if (bpm != null) lines.push(`BPM: ${bpm}`)
  if (key) lines.push(`Key: ${key}`)
  if (moods.length) lines.push(`Mood: ${moods.join(', ')}`)
  if (trackUrl) {
    if (lines.length) lines.push('')
    lines.push(trackUrl)
  }
  if (!lines.length) return 'Synced from Beatbox'
  return lines.join('\n')
}

export function mapTrackToYouTubeSnippet(
  track: Partial<Track>,
  options: { trackUrl?: string | null } = {},
): YouTubeUploadSnippet {
  const title = trimOrEmpty(track.title)
  if (!title) throw new Error('Title is required to sync to YouTube')

  const tags = new Set<string>()
  const genre = trimOrEmpty(track.genre)
  if (genre) tags.add(genre)
  for (const mood of moodTags(track.mood)) tags.add(mood)
  const artist = trimOrEmpty(track.artist)
  if (artist) tags.add(artist)

  return {
    title: title.slice(0, 100),
    description: buildYouTubeDescription(track, options.trackUrl).slice(0, 5000),
    tags: Array.from(tags).slice(0, 20),
    privacyStatus: 'unlisted',
  }
}
