import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createError } from 'h3'

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  endpoint: string
}

export type ArtworkKind = 'track' | 'collection'

function readR2Credentials() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || ''
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')

  return { accountId, accessKeyId, secretAccessKey, endpoint }
}

export function readR2Env(bucket = process.env.R2_BUCKET?.trim() || ''): R2Config | null {
  const { accountId, accessKeyId, secretAccessKey, endpoint } = readR2Credentials()

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    return null
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint }
}

export function readTrackArtworkBucket(): string {
  return process.env.R2_TRACK_ARTWORK_BUCKET?.trim() || ''
}

export function readCollectionArtworkBucket(): string {
  return process.env.R2_COLLECTION_ARTWORK_BUCKET?.trim() || ''
}

export function readArtworkBucket(kind: ArtworkKind): string {
  const bucket =
    kind === 'track' ? readTrackArtworkBucket() : readCollectionArtworkBucket()

  if (!bucket) {
    throw createError({
      statusCode: 503,
      statusMessage: `R2 artwork bucket is not configured for ${kind}`,
    })
  }

  return bucket
}

export function requireR2Config(bucket?: string): R2Config {
  const resolvedBucket = bucket || process.env.R2_BUCKET?.trim() || ''
  const config = readR2Env(resolvedBucket)
  if (!config) {
    throw createError({
      statusCode: 503,
      statusMessage: 'R2 storage is not configured',
    })
  }
  return config
}

export function getR2Client(config: R2Config = requireR2Config()): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  })
}

export async function presignR2Upload(
  key: string,
  contentType: string,
  expiresIn = 3600,
  bucket?: string,
): Promise<string> {
  const config = requireR2Config(bucket)
  const client = getR2Client(config)
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, {
    expiresIn,
    signableHeaders: new Set(['content-type']),
  })
}

export async function presignR2Download(
  key: string,
  expiresIn = 86400,
  bucket?: string,
): Promise<string> {
  const config = requireR2Config(bucket)
  const client = getR2Client(config)
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn })
}

export async function deleteR2Object(key: string, bucket?: string): Promise<void> {
  const config = requireR2Config(bucket)
  const client = getR2Client(config)
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  )
}

export async function uploadR2Object(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  bucket?: string,
): Promise<void> {
  const config = requireR2Config(bucket)
  const client = getR2Client(config)
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export async function downloadR2Object(key: string, bucket?: string): Promise<Buffer> {
  const config = requireR2Config(bucket)
  const client = getR2Client(config)
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  )

  if (!response.Body) {
    throw new Error('Empty R2 response body')
  }

  const bytes = await response.Body.transformToByteArray()
  return Buffer.from(bytes)
}
