/**
 * Backfill null/0 file_size on sounds from R2 HeadObject or Supabase Storage metadata.
 * Dry-run by default. Run with enforcement off.
 *
 *   npx tsx scripts/backfill-sound-file-sizes.ts
 *   npx tsx scripts/backfill-sound-file-sizes.ts --write
 */

import { createClient } from '@supabase/supabase-js'
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import * as dotenv from 'dotenv'

dotenv.config()

const write = process.argv.includes('--write')
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NUXT_SUPABASE_SERVICE_KEY ||
  process.env.NUXT_PUBLIC_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || ''
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')
  if (!accessKeyId || !secretAccessKey || !endpoint) return null
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })
}

async function headR2Size(key: string): Promise<number | null> {
  const client = getR2Client()
  const bucket = process.env.R2_BUCKET?.trim()
  if (!client || !bucket) return null
  try {
    const res = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    )
    return res.ContentLength ?? null
  } catch (err: any) {
    console.warn(`  R2 head failed for ${key}: ${err.message}`)
    return null
  }
}

async function headSupabaseSize(path: string): Promise<number | null> {
  const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
  const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path
  const { data, error } = await supabase.storage.from('sounds').list(folder || undefined, {
    search: name,
    limit: 100,
  })
  if (error) {
    console.warn(`  Supabase list failed for ${path}: ${error.message}`)
    return null
  }
  const match = (data || []).find((f) => f.name === name)
  const size = match?.metadata?.size
  return typeof size === 'number' ? size : null
}

async function main() {
  console.log(write ? 'WRITE mode' : 'DRY RUN (pass --write to update)')
  const { data: rows, error } = await supabase
    .from('sounds')
    .select('id, storage_path, storage_provider, file_size')
    .or('file_size.is.null,file_size.eq.0')
    .order('id', { ascending: true })

  if (error) throw error
  if (!rows?.length) {
    console.log('No rows need backfill.')
    return
  }

  console.log(`Found ${rows.length} rows with null/0 file_size\n`)
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.storage_path) {
      console.log(`#${row.id}: no storage_path, skip`)
      skipped++
      continue
    }

    const provider = row.storage_provider === 'r2' ? 'r2' : 'supabase'
    const size =
      provider === 'r2'
        ? await headR2Size(row.storage_path)
        : await headSupabaseSize(row.storage_path)

    if (size == null || size <= 0) {
      console.log(`#${row.id}: could not resolve size (${provider}:${row.storage_path})`)
      skipped++
      continue
    }

    console.log(`#${row.id}: ${provider} ${row.storage_path} -> ${size} bytes`)
    if (write) {
      const { error: updateError } = await supabase
        .from('sounds')
        .update({ file_size: size })
        .eq('id', row.id)
      if (updateError) {
        console.error(`  update failed: ${updateError.message}`)
        skipped++
        continue
      }
      updated++
    }
  }

  console.log(`\nDone. ${write ? `Updated ${updated}.` : 'No writes.'} Skipped ${skipped}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
