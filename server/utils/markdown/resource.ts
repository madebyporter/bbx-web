import { getMarkdownSupabase } from './supabase'

const SITE_ORIGIN = 'https://beatbox.studio'

interface ResourceMarkdown {
  name: string
  slug: string
  creator: string
  price: string
  link: string
  description: string | null
  os: string[]
  tags: string[]
  seoLabel: string
  listPath: string
}

async function fetchApprovedResource(
  slug: string,
  kind: 'software' | 'kits',
): Promise<ResourceMarkdown | null> {
  const supabase = getMarkdownSupabase()
  if (!supabase) return null

  const typeSlug = kind === 'kits' ? 'sounds' : 'software'
  const seoLabel = kind === 'kits' ? 'Music Production Kit' : 'Music Production Software'
  const listPath = kind === 'kits' ? '/kits' : '/software'

  const { data: typeData, error: typeError } = await supabase
    .from('resource_types')
    .select('id')
    .eq('slug', typeSlug)
    .single()

  if (typeError || !typeData?.id) return null

  const { data, error } = await supabase
    .from('resources')
    .select(`
      name,
      slug,
      price,
      link,
      description,
      os,
      creator:creators(name),
      resource_tags(tags(name))
    `)
    .eq('slug', slug)
    .eq('status', 'approved')
    .eq('type_id', typeData.id)
    .single()

  if (error || !data) return null

  const tags =
    ((data.resource_tags as Array<{ tags?: { name?: string } }> | null) ?? [])
      .map((rt) => rt.tags?.name)
      .filter((name): name is string => Boolean(name))

  return {
    name: String(data.name ?? ''),
    slug: String(data.slug ?? slug),
    creator: (data.creator as { name?: string } | null)?.name ?? '',
    price: String(data.price ?? ''),
    link: String(data.link ?? ''),
    description: data.description ? String(data.description) : null,
    os: Array.isArray(data.os) ? data.os.map(String) : [],
    tags,
    seoLabel,
    listPath,
  }
}

function formatOsList(os: string[]): string {
  const labels: Record<string, string> = {
    mac: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
  }
  return os.map((value) => labels[value] ?? value).join(', ')
}

export async function buildResourceMarkdown(
  slug: string,
  kind: 'software' | 'kits',
): Promise<string | null> {
  const resource = await fetchApprovedResource(slug, kind)
  if (!resource) return null

  const canonicalPath = `${resource.listPath}/${resource.slug}`
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`
  const fallbackDescription = `${resource.name} by ${resource.creator}. ${resource.price}. ${resource.tags.join(', ')}.`
  const description = resource.description?.trim() || fallbackDescription

  const lines: string[] = []
  lines.push(`# ${resource.name}`)
  lines.push('')
  lines.push(description)
  lines.push('')
  lines.push(`- **Creator:** ${resource.creator}`)
  lines.push(`- **Price:** ${resource.price}`)
  if (resource.os.length > 0) {
    lines.push(`- **OS:** ${formatOsList(resource.os)}`)
  }
  if (resource.tags.length > 0) {
    lines.push(`- **Tags:** ${resource.tags.join(', ')}`)
  }
  if (resource.link) {
    lines.push(`- **Link:** ${resource.link}`)
  }
  lines.push(`- **URL:** ${canonicalUrl}`)
  lines.push('')
  lines.push(`[Browse all ${kind === 'kits' ? 'kits' : 'software'}](${SITE_ORIGIN}${resource.listPath})`)
  lines.push('')

  return lines.join('\n')
}
