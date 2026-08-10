/**
 * Backfill resources.description from link meta tags, with OpenAI fallback from name/creator.
 * Run with: npm run backfill:resource-descriptions
 * Dry run: npm run backfill:resource-descriptions -- --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolveResourceDescription } from '../server/utils/resolveResourceDescription'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NUXT_SUPABASE_SERVICE_KEY ||
  process.env.NUXT_PUBLIC_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const dryRun = process.argv.includes('--dry-run')
const delayMs = 1000

interface BackfillResource {
  id: number
  name: string
  slug: string | null
  link: string | null
  price: string | null
  description: string | null
  creator: string | null
  tags: string[]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function backfillResourceDescriptions() {
  console.log(`Starting resource description backfill${dryRun ? ' (dry run)' : ''}...\n`)

  const { data: resources, error } = await supabase
    .from('resources')
    .select(`
      id,
      name,
      slug,
      link,
      price,
      description,
      creator:creators(name),
      resource_tags(
        tags(name)
      )
    `)
    .eq('status', 'approved')
    .order('id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch resources: ${error.message}`)
  }

  const targets = (resources || [])
    .map((resource: any): BackfillResource => ({
      id: resource.id,
      name: resource.name,
      slug: resource.slug,
      link: resource.link,
      price: resource.price,
      description: resource.description,
      creator: resource.creator?.name || null,
      tags: resource.resource_tags?.map((rt: any) => rt.tags?.name).filter(Boolean) || [],
    }))
    .filter((resource) => !resource.description || !String(resource.description).trim())

  if (targets.length === 0) {
    console.log('No approved resources need description backfill.')
    return
  }

  console.log(`Found ${targets.length} resources to process\n`)

  let successCount = 0
  let skipCount = 0
  let failCount = 0
  let metaCount = 0
  let generatedCount = 0

  for (const resource of targets) {
    const label = resource.slug || resource.name || `#${resource.id}`
    const link = resource.link?.trim() || null

    try {
      const result = await resolveResourceDescription(link, {
        name: resource.name,
        creator: resource.creator || undefined,
        price: resource.price || undefined,
        tags: resource.tags,
        optimize: true,
        generateIfMissing: true,
      })

      if (!result.description) {
        console.log(`SKIP ${label}: ${result.error || 'No description found'}`)
        skipCount++
      } else if (dryRun) {
        const source = result.source === 'generated' ? 'generated' : 'meta'
        if (source === 'generated') generatedCount++
        else metaCount++
        console.log(
          `DRY RUN [${source}] ${label}: ${result.description.slice(0, 120)}${result.description.length > 120 ? '...' : ''}`
        )
        successCount++
      } else {
        const { error: updateError } = await supabase
          .from('resources')
          .update({ description: result.description })
          .eq('id', resource.id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        if (result.source === 'generated') generatedCount++
        else metaCount++

        console.log(`OK [${result.source}] ${label}`)
        successCount++
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`FAIL ${label}: ${message}`)
      failCount++
    }

    await sleep(delayMs)
  }

  console.log(
    `\nDone. success=${successCount} skip=${skipCount} fail=${failCount} meta=${metaCount} generated=${generatedCount}`
  )
}

backfillResourceDescriptions().catch((error) => {
  console.error(error)
  process.exit(1)
})
