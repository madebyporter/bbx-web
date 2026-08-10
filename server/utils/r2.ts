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

export function readR2Env(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || ''
  const bucket = process.env.R2_BUCKET?.trim() || ''
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    return null
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint }
}

export function requireR2Config(): R2Config {
  const config = readR2Env()
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
  })
}

export async function presignR2Upload(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const config = requireR2Config()
  const client = getR2Client(config)
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn })
}

export async function presignR2Download(
  key: string,
  expiresIn = 86400,
): Promise<string> {
  const config = requireR2Config()
  const client = getR2Client(config)
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn })
}

export async function deleteR2Object(key: string): Promise<void> {
  const config = requireR2Config()
  const client = getR2Client(config)
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  )
}

export async function downloadR2Object(key: string): Promise<Buffer> {
  const config = requireR2Config()
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
