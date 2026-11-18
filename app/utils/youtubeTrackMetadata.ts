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

/** Public track page slug: `title-slug-{id}` (matches `/u/:username/t/:track`). */
export function generateTrackPageSlug(track: {
  title?: string | null
  id: number | string
}): string {
  const id = Number(track.id)
  const title = trimOrEmpty(track.title)
  if (title && Number.isFinite(id) && id > 0) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (slug) return `${slug}-${id}`
  }
  if (Number.isFinite(id) && id > 0) return `track-${id}`
  return 'track'
}

/** Absolute Beatbox track detail URL, or null when username is missing. */
export function buildBeatboxTrackDetailUrl(
  origin: string,
  username: string | null | undefined,
  track: { title?: string | null; id: number | string },
): string | null {
  const user = trimOrEmpty(username)
  if (!user) return null
  const base = trimOrEmpty(origin).replace(/\/$/, '')
  if (!base) return null
  return `${base}/u/${user}/t/${generateTrackPageSlug(track)}`
}

function appendTrackDetailsSection(body: string, trackUrl?: string | null): string {
  const url = trimOrEmpty(trackUrl)
  if (!url) return body.slice(0, 5000)
  if (body.includes(url) || body.includes('/t/')) {
    return body.slice(0, 5000)
  }
  const block = body ? `${body}\n\nTrack details:\n${url}` : `Track details:\n${url}`
  return block.slice(0, 5000)
}

export function buildYouTubeDescription(
  track: Partial<Track>,
  trackUrl?: string | null,
): string {
  const custom = trimOrEmpty(track.description)
  if (custom) {
    return appendTrackDetailsSection(custom, trackUrl)
  }

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

  const body = lines.join('\n')
  const withDetails = appendTrackDetailsSection(body, trackUrl)
  if (!trimOrEmpty(withDetails)) return 'Synced from Beatbox'
  return withDetails
}

export function mapTrackToYouTubeSnippet(
  track: Partial<Track>,
  options: { trackUrl?: string | null } = {},
): YouTubeUploadSnippet {
  const title = trimOrEmpty(track.youtube_title) || trimOrEmpty(track.title)
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
    privacyStatus: 'public',
  }
}
