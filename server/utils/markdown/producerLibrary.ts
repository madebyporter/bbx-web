import { getMarkdownSupabase } from './supabase'

const SITE_ORIGIN = 'https://beatbox.studio'
const MAX_TRACKS = 50

interface ProfileRow {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  website: string | null
  social_links: Record<string, string> | null
}

interface TrackRow {
  title: string
  artist: string
  version: string | null
  genre: string | null
  mood: string | null
  bpm: number | null
  year: number | null
}

interface SoftwareRow {
  name: string
  tags: string[]
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

async function fetchProfile(usernameOrId: string): Promise<ProfileRow | null> {
  const supabase = getMarkdownSupabase()
  if (!supabase) return null

  const select = 'id, username, display_name, bio, website, social_links'

  if (isUuid(usernameOrId)) {
    const { data } = await supabase
      .from('user_profiles')
      .select(select)
      .eq('id', usernameOrId)
      .single()
    if (data) return data as ProfileRow
  }

  const { data: byUsername } = await supabase
    .from('user_profiles')
    .select(select)
    .eq('username', usernameOrId)
    .single()

  if (byUsername) return byUsername as ProfileRow

  if (!isUuid(usernameOrId)) {
    const { data: byId } = await supabase
      .from('user_profiles')
      .select(select)
      .eq('id', usernameOrId)
      .single()
    if (byId) return byId as ProfileRow
  }

  return null
}

async function fetchPublicTracks(userId: string): Promise<TrackRow[]> {
  const supabase = getMarkdownSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('sounds')
    .select('title, artist, version, genre, mood, bpm, year')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(MAX_TRACKS)

  if (error || !data) return []
  return data as TrackRow[]
}

async function fetchProfileSoftware(userId: string): Promise<SoftwareRow[]> {
  const supabase = getMarkdownSupabase()
  if (!supabase) return []

  const { data: typeData } = await supabase
    .from('resource_types')
    .select('id')
    .eq('slug', 'software')
    .single()

  if (!typeData?.id) return []

  const { data, error } = await supabase
    .from('user_resources')
    .select(`
      resources!inner (
        name,
        type_id,
        resource_tags (
          tags (name)
        )
      )
    `)
    .eq('user_id', userId)
    .eq('resources.type_id', typeData.id)

  if (error || !data) return []

  return data
    .map((item: Record<string, unknown>) => {
      const resource = item.resources as Record<string, unknown> | null
      if (!resource) return null
      const tags =
        ((resource.resource_tags as Array<{ tags?: { name?: string } }> | null) ?? [])
          .map((rt) => rt.tags?.name)
          .filter((name): name is string => Boolean(name))
      return {
        name: String(resource.name ?? ''),
        tags,
      }
    })
    .filter((row): row is SoftwareRow => row !== null)
}

function formatTrackLine(track: TrackRow): string {
  const parts: string[] = []
  if (track.version) parts.push(track.version)
  if (track.genre) parts.push(track.genre)
  if (track.mood) parts.push(track.mood)
  if (track.bpm != null) parts.push(`${track.bpm} BPM`)
  if (track.year != null) parts.push(String(track.year))
  const suffix = parts.length ? ` (${parts.join(', ')})` : ''
  const artist = track.artist ? ` — ${track.artist}` : ''
  return `- ${track.title}${artist}${suffix}`
}

export async function buildProducerLibraryMarkdown(usernameOrId: string): Promise<string | null> {
  const profile = await fetchProfile(usernameOrId)
  if (!profile) return null

  const [tracks, software] = await Promise.all([
    fetchPublicTracks(profile.id),
    fetchProfileSoftware(profile.id),
  ])

  const displayName = profile.display_name || profile.username || usernameOrId
  const handle = profile.username ? `@${profile.username}` : null
  const canonicalSlug = profile.username || profile.id
  const canonicalUrl = `${SITE_ORIGIN}/u/${canonicalSlug}`

  const lines: string[] = []
  lines.push(`# ${displayName}'s Music Library`)
  lines.push('')
  if (handle) {
    lines.push(handle)
    lines.push('')
  }

  if (profile.bio?.trim()) {
    lines.push(profile.bio.trim())
    lines.push('')
  }

  if (profile.website?.trim()) {
    lines.push(`- **Website:** ${profile.website.trim()}`)
  }

  const social = profile.social_links ?? {}
  for (const [network, url] of Object.entries(social)) {
    if (url?.trim()) {
      lines.push(`- **${network}:** ${url.trim()}`)
    }
  }

  if (profile.website?.trim() || Object.values(social).some((url) => url?.trim())) {
    lines.push('')
  }

  if (software.length > 0) {
    lines.push('## Software')
    lines.push('')
    for (const item of software) {
      const tagSuffix = item.tags.length ? ` (${item.tags.join(', ')})` : ''
      lines.push(`- ${item.name}${tagSuffix}`)
    }
    lines.push('')
  }

  lines.push('## Music')
  lines.push('')
  if (tracks.length === 0) {
    lines.push('No public tracks yet.')
  } else {
    for (const track of tracks) {
      lines.push(formatTrackLine(track))
    }
    if (tracks.length >= MAX_TRACKS) {
      lines.push('')
      lines.push(`_Showing the latest ${MAX_TRACKS} public tracks._`)
    }
  }
  lines.push('')
  lines.push(`**URL:** ${canonicalUrl}`)
  lines.push('')

  return lines.join('\n')
}
