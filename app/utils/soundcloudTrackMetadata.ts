import type { Track } from '~/types/track'

export type MetadataFieldKey =
  | 'title'
  | 'artist'
  | 'genre'
  | 'bpm'
  | 'key'
  | 'mood'
  | 'artwork'
  | 'description'

export type MetadataFieldSeverity = 'required' | 'recommended' | 'info'

export interface MetadataFieldStatus {
  key: MetadataFieldKey
  label: string
  severity: MetadataFieldSeverity
  filled: boolean
  valuePreview?: string | null
  hint?: string
}

export interface SoundCloudUploadFields {
  title: string
  artist: string
  genre?: string
  tagList: string
  description: string
  sharing: 'public' | 'private'
  releaseDate?: string
}

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

function quoteTag(tag: string): string {
  if (/\s/.test(tag)) return `"${tag.replace(/"/g, '')}"`
  return tag
}

export function buildSoundCloudTagList(track: Partial<Track>): string {
  const tags: string[] = []

  for (const mood of moodTags(track.mood)) {
    tags.push(quoteTag(mood))
  }

  if (track.bpm != null && Number.isFinite(Number(track.bpm))) {
    const bpm = Math.round(Number(track.bpm))
    tags.push(`bpm:${bpm}`)
    tags.push(`${bpm}bpm`)
  }

  const key = trimOrEmpty(track.key)
  if (key) tags.push(quoteTag(key))

  const version = trimOrEmpty(track.version)
  if (version) tags.push(quoteTag(version))

  return tags.join(' ')
}

export function buildSoundCloudDescription(
  track: Partial<Track>,
  trackUrl?: string | null,
): string {
  const custom = trimOrEmpty(track.description)
  if (custom) {
    if (trackUrl && !custom.includes(trackUrl)) {
      return `${custom}\n\n${trackUrl}`
    }
    return custom
  }

  const lines: string[] = []
  const artist = trimOrEmpty(track.artist)
  const genre = trimOrEmpty(track.genre)
  const key = trimOrEmpty(track.key)
  const bpm = track.bpm != null && Number.isFinite(Number(track.bpm)) ? Math.round(Number(track.bpm)) : null
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

  if (!lines.length) {
    return 'Synced from Beatbox'
  }

  return lines.join('\n')
}

export function getMetadataFieldStatuses(track: Partial<Track> | null | undefined): MetadataFieldStatus[] {
  const t = track || {}
  const title = trimOrEmpty(t.title)
  const artist = trimOrEmpty(t.artist)
  const genre = trimOrEmpty(t.genre)
  const key = trimOrEmpty(t.key)
  const moods = moodTags(t.mood)
  const bpmFilled = t.bpm != null && Number.isFinite(Number(t.bpm)) && Number(t.bpm) > 0
  const artworkFilled = Boolean(trimOrEmpty(t.artwork_path))

  return [
    {
      key: 'title',
      label: 'Title',
      severity: 'required',
      filled: Boolean(title),
      valuePreview: title || null,
    },
    {
      key: 'artist',
      label: 'Artist',
      severity: 'required',
      filled: Boolean(artist),
      valuePreview: artist || null,
    },
    {
      key: 'genre',
      label: 'Genre',
      severity: 'recommended',
      filled: Boolean(genre),
      valuePreview: genre || null,
    },
    {
      key: 'bpm',
      label: 'BPM',
      severity: 'recommended',
      filled: bpmFilled,
      valuePreview: bpmFilled ? String(Math.round(Number(t.bpm))) : null,
    },
    {
      key: 'key',
      label: 'Key',
      severity: 'recommended',
      filled: Boolean(key),
      valuePreview: key || null,
    },
    {
      key: 'mood',
      label: 'Mood',
      severity: 'recommended',
      filled: moods.length > 0,
      valuePreview: moods.length ? moods.join(', ') : null,
    },
    {
      key: 'artwork',
      label: 'Artwork',
      severity: 'recommended',
      filled: artworkFilled,
      valuePreview: artworkFilled ? 'Present' : null,
    },
    {
      key: 'description',
      label: 'Description',
      severity: 'recommended',
      filled: Boolean(trimOrEmpty(t.description)),
      valuePreview: trimOrEmpty(t.description)
        ? trimOrEmpty(t.description).slice(0, 80) +
          (trimOrEmpty(t.description).length > 80 ? '…' : '')
        : null,
      hint: 'Optional — auto-built from metadata on sync if empty',
    },
  ]
}

export function hasRequiredMetadata(track: Partial<Track> | null | undefined): boolean {
  return getMetadataFieldStatuses(track)
    .filter((f) => f.severity === 'required')
    .every((f) => f.filled)
}

export function mapTrackToSoundCloudFields(
  track: Partial<Track>,
  options: { trackUrl?: string | null } = {},
): SoundCloudUploadFields {
  const title = trimOrEmpty(track.title)
  const artist = trimOrEmpty(track.artist)
  if (!title || !artist) {
    throw new Error('Title and artist are required to sync to SoundCloud')
  }

  const year = track.year != null && Number.isFinite(Number(track.year)) ? Number(track.year) : null
  const releaseDate =
    year != null && year >= 1000 && year <= 9999 ? `${year}-01-01` : undefined

  return {
    title,
    artist,
    genre: trimOrEmpty(track.genre) || undefined,
    tagList: buildSoundCloudTagList(track),
    description: buildSoundCloudDescription(track, options.trackUrl),
    sharing: track.is_public === false ? 'private' : 'public',
    releaseDate,
  }
}
