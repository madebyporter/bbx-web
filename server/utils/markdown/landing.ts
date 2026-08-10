import { getMarkdownSupabase } from './supabase'

const SITE_ORIGIN = 'https://beatbox.studio'

const HOW_STEPS = [
  {
    title: 'Collect',
    body: 'Upload tracks into your library with the metadata you already care about.',
  },
  {
    title: 'Organize',
    body: 'Group versions, build collections, and set status so nothing gets lost mid-project.',
  },
  {
    title: 'Share',
    body: 'Invite collaborators or send a collection link when it\'s ready for ears.',
  },
]

const CAPABILITIES = [
  {
    title: 'Music library',
    body: 'Filter, sort, and play your catalog in one place — built like a studio tool, not a generic file dump.',
  },
  {
    title: 'Collections & versions',
    body: 'Keep every bounce of a track together, focus on latest versions, and ship collections that actually make sense.',
  },
  {
    title: 'Status & feedback',
    body: 'Mark what\'s WIP, in review, or done — then gather comments without losing the thread.',
  },
]

interface LatestSoftwareRow {
  name: string
  slug: string
  creator: string
  price: string
  tags: string[]
}

async function fetchLatestSoftware(limit = 3): Promise<LatestSoftwareRow[]> {
  const supabase = getMarkdownSupabase()
  if (!supabase) return []

  const { data: typeData } = await supabase
    .from('resource_types')
    .select('id')
    .eq('slug', 'software')
    .single()

  if (!typeData?.id) return []

  const { data, error } = await supabase
    .from('resources')
    .select(`
      name,
      slug,
      price,
      creator:creators(name),
      resource_tags(tags(name))
    `)
    .eq('status', 'approved')
    .eq('type_id', typeData.id)
    .not('slug', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((item: Record<string, unknown>) => ({
    name: String(item.name ?? ''),
    slug: String(item.slug ?? ''),
    creator: (item.creator as { name?: string } | null)?.name ?? '',
    price: String(item.price ?? ''),
    tags:
      ((item.resource_tags as Array<{ tags?: { name?: string } }> | null) ?? [])
        .map((rt) => rt.tags?.name)
        .filter((name): name is string => Boolean(name)),
  }))
}

export async function buildLandingMarkdown(): Promise<string> {
  const latestSoftware = await fetchLatestSoftware(3)
  const lines: string[] = []

  lines.push('# Beatbox')
  lines.push('')
  lines.push('## Project management for music producers.')
  lines.push('')
  lines.push(
    'Keep every bounce, version, and collection in one studio workspace — then share it for feedback.',
  )
  lines.push('')
  lines.push(`[Create free account](${SITE_ORIGIN}/) · [Browse tools](${SITE_ORIGIN}/software)`)
  lines.push('')

  lines.push('## From bounce to shared collection')
  lines.push('')
  lines.push('A simple workflow for finishing and delivering music.')
  lines.push('')
  for (const [i, step] of HOW_STEPS.entries()) {
    lines.push(`### ${String(i + 1).padStart(2, '0')}. ${step.title}`)
    lines.push('')
    lines.push(step.body)
    lines.push('')
  }

  lines.push('## Built for how producers actually work')
  lines.push('')
  lines.push('Library ops without the spreadsheet chaos.')
  lines.push('')
  for (const cap of CAPABILITIES) {
    lines.push(`### ${cap.title}`)
    lines.push('')
    lines.push(cap.body)
    lines.push('')
  }

  lines.push("## Who it's for")
  lines.push('')
  lines.push('### Audio Pros')
  lines.push('')
  lines.push(
    'Producers and engineers who need statuses, versions, analytics, and a library built to ship.',
  )
  lines.push('')
  lines.push('### Creators')
  lines.push('')
  lines.push('Artists and writers who want a lighter home for music and feedback.')
  lines.push('')

  lines.push('## Plus a curated catalog of production tools')
  lines.push('')
  lines.push(
    'DAWs, plugins, and kits producers actually use — mark what you use and show it on your profile.',
  )
  lines.push('')
  lines.push(`- [Browse software](${SITE_ORIGIN}/software)`)
  lines.push(`- [Browse kits](${SITE_ORIGIN}/kits)`)
  lines.push('')

  if (latestSoftware.length > 0) {
    lines.push('### Latest software')
    lines.push('')
    for (const resource of latestSoftware) {
      const meta = [resource.creator, resource.price].filter(Boolean).join(' · ')
      const tagSuffix = resource.tags.length ? ` (${resource.tags.slice(0, 3).join(', ')})` : ''
      lines.push(
        `- [${resource.name}](${SITE_ORIGIN}/software/${resource.slug})${meta ? ` — ${meta}` : ''}${tagSuffix}`,
      )
    }
    lines.push('')
  }

  lines.push('## Start organizing your studio')
  lines.push('')
  lines.push('Project management for music producers — free to start.')
  lines.push('')
  lines.push(`[Create free account](${SITE_ORIGIN}/)`)
  lines.push('')

  return lines.join('\n')
}
