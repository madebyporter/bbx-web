/**
 * Backfill track and collection artwork from Supabase Storage to Cloudflare R2.
 *
 * Usage:
 *   npx tsx scripts/backfill-artwork-to-r2.ts --dry-run
 *   npx tsx scripts/backfill-artwork-to-r2.ts
 *   npx tsx scripts/backfill-artwork-to-r2.ts --delete-supabase
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NUXT_SUPABASE_SERVICE_KEY ||
  process.env.NUXT_PUBLIC_SERVICE_ROLE

const trackBucket = process.env.R2_TRACK_ARTWORK_BUCKET?.trim()
const collectionBucket = process.env.R2_COLLECTION_ARTWORK_BUCKET?.trim()
const accountId = process.env.R2_ACCOUNT_ID?.trim() || ''
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || ''
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || ''
const endpoint =
  process.env.R2_ENDPOINT?.trim() ||
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const deleteSupabase = args.has('--delete-supabase')

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

if (!trackBucket || !collectionBucket || !accessKeyId || !secretAccessKey || !endpoint) {
  console.error('Missing R2 artwork bucket or credential env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)
const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: 'WHEN_REQUIRED',
})

type Row = {
  id: number
  artwork_path: string
}

function getPublicArtworkUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/artwork/${path}`
}

function guessContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || 'jpg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'mp4') return 'video/mp4'
  if (ext === 'mov') return 'video/quicktime'
  return 'image/jpeg'
}

async function migrateRows(
  label: 'track' | 'collection',
  table: 'sounds' | 'collections',
  bucket: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select('id, artwork_path')
    .not('artwork_path', 'is', null)
    .eq('artwork_provider', 'supabase')

  if (error) {
    throw new Error(`${label} query failed: ${error.message}`)
  }

  const rows = (data || []) as Row[]
  console.log(`\n${label}: ${rows.length} artwork object(s) to migrate`)

  let migrated = 0
  let failed = 0

  for (const row of rows) {
    const path = row.artwork_path
    const publicUrl = getPublicArtworkUrl(path)

    try {
      if (dryRun) {
        console.log(`[dry-run] ${label} #${row.id} -> r2://${bucket}/${path}`)
        migrated++
        continue
      }

      const response = await fetch(publicUrl)
      if (!response.ok) {
        throw new Error(`download failed (${response.status})`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') || guessContentType(path)

      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: path,
          Body: buffer,
          ContentType: contentType,
        }),
      )

      const { error: updateError } = await supabase
        .from(table)
        .update({ artwork_provider: 'r2' })
        .eq('id', row.id)

      if (updateError) {
        throw new Error(`db update failed: ${updateError.message}`)
      }

      if (deleteSupabase) {
        const { error: removeError } = await supabase.storage.from('artwork').remove([path])
        if (removeError) {
          console.warn(`  warn: could not delete Supabase object ${path}: ${removeError.message}`)
        }
      }

      migrated++
      console.log(`  migrated ${label} #${row.id}`)
    } catch (err) {
      failed++
      console.error(`  failed ${label} #${row.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  return { migrated, failed }
}

async function main() {
  console.log(`Backfill artwork to R2${dryRun ? ' (dry-run)' : ''}${deleteSupabase ? ' + delete Supabase' : ''}`)

  const trackResult = await migrateRows('track', 'sounds', trackBucket)
  const collectionResult = await migrateRows('collection', 'collections', collectionBucket)

  console.log('\nSummary')
  console.log(
    `Tracks: ${trackResult.migrated} migrated, ${trackResult.failed} failed`,
  )
  console.log(
    `Collections: ${collectionResult.migrated} migrated, ${collectionResult.failed} failed`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
