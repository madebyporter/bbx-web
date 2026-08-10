/**
 * One-time script to backfill resources.description from each resource link's meta tags.
 * Run with: npm run backfill:resource-descriptions
 * Dry run: npm run backfill:resource-descriptions -- --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fetchMetaDescription } from '../server/utils/fetchMetaDescription'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NUXT_PUBLIC_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SERVICE_ROLE in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const dryRun = process.argv.includes('--dry-run')
const delayMs = 1000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function backfillResourceDescriptions() {
  console.log(`Starting resource description backfill${dryRun ? ' (dry run)' : ''}...\n`)

  const { data: resources, error } = await supabase
    .from('resources')
    .select('id, name, slug, link, description')
    .eq('status', 'approved')
    .not('link', 'is', null)
    .order('id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch resources: ${error.message}`)
  }

  const targets = (resources || []).filter((resource) => {
    const hasLink = typeof resource.link === 'string' && resource.link.trim().length > 0
    const missingDescription = !resource.description || !String(resource.description).trim()
    return hasLink && missingDescription
  })

  if (targets.length === 0) {
    console.log('No approved resources need description backfill.')
    return
  }

  console.log(`Found ${targets.length} resources to process\n`)

  let successCount = 0
  let skipCount = 0
  let failCount = 0

  for (const resource of targets) {
    const label = resource.slug || resource.name || `#${resource.id}`
    const link = String(resource.link).trim()

    try {
      const result = await fetchMetaDescription(link)

      if (!result.description) {
        console.log(`SKIP ${label}: ${result.error || 'No description found'}`)
        skipCount++
      } else if (dryRun) {
        console.log(`DRY RUN ${label}: ${result.description.slice(0, 120)}${result.description.length > 120 ? '...' : ''}`)
        successCount++
      } else {
        const { error: updateError } = await supabase
          .from('resources')
          .update({ description: result.description })
          .eq('id', resource.id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        console.log(`OK ${label}`)
        successCount++
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`FAIL ${label}: ${message}`)
      failCount++
    }

    await sleep(delayMs)
  }

  console.log(`\nDone. success=${successCount} skip=${skipCount} fail=${failCount}`)
}

backfillResourceDescriptions().catch((error) => {
  console.error(error)
  process.exit(1)
})
