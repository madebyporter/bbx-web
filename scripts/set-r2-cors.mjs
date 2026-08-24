/**
 * Apply browser CORS rules on the R2 bucket used for direct PUT uploads.
 *
 * Requires an R2 API token with Admin Read & Write (object-only keys get AccessDenied).
 * Or paste the same JSON in Cloudflare Dashboard → R2 → your bucket → Settings → CORS Policy.
 *
 * Usage: node --env-file=.env scripts/set-r2-cors.mjs
 */
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'

const accountId = process.env.R2_ACCOUNT_ID?.trim() || ''
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || ''
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || ''
const bucket = process.env.R2_BUCKET?.trim() || ''
const endpoint =
  process.env.R2_ENDPOINT?.trim() ||
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')

if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
  console.error('Missing R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_ENDPOINT')
  process.exit(1)
}

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: 'WHEN_REQUIRED',
})

const CORSRules = [
  {
    AllowedOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://beatbox.studio',
      'https://www.beatbox.studio',
    ],
    AllowedMethods: ['GET', 'PUT', 'HEAD'],
    AllowedHeaders: ['Content-Type'],
    ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
    MaxAgeSeconds: 3600,
  },
]

try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules },
    }),
  )
  const after = await client.send(new GetBucketCorsCommand({ Bucket: bucket }))
  console.log(`CORS applied to ${bucket}:`)
  console.log(JSON.stringify(after.CORSRules, null, 2))
} catch (err) {
  const code = err?.name || err?.Code || 'Error'
  console.error(`${code}: ${err?.message || err}`)
  if (code === 'AccessDenied') {
    console.error(`
Your R2 S3 API token cannot manage bucket CORS (object R/W only).

Paste this in Cloudflare Dashboard → R2 → ${bucket} → Settings → CORS Policy:
`)
    console.error(JSON.stringify(CORSRules, null, 2))
  }
  process.exit(1)
}
