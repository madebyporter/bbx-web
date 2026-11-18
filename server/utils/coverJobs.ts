import { createError } from 'h3'
import { deleteR2Object, downloadR2Object, uploadR2Object } from './r2'

export type CoverJobStatus = 'pending' | 'ready' | 'failed'

export interface CoverJobRecord {
  status: CoverJobStatus
  userId: string
  createdAt: string
  updatedAt: string
  error?: string
  mimeType?: string
  provider?: string
  model?: string
}

export function coverJobMetaKey(userId: string, jobId: string): string {
  return `cover-jobs/${userId}/${jobId}.json`
}

export function coverJobImageKey(userId: string, jobId: string): string {
  return `cover-jobs/${userId}/${jobId}.png`
}

export function readCoverJobSecret(): string {
  return (
    process.env.COVER_JOB_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ''
  )
}

export function assertCoverJobSecret(headerValue: string | undefined): void {
  const expected = readCoverJobSecret()
  if (!expected) {
    throw createError({
      statusCode: 503,
      statusMessage: 'COVER_JOB_SECRET (or CRON_SECRET) is not configured',
    })
  }
  if (!headerValue || headerValue !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}

export async function writeCoverJobMeta(record: CoverJobRecord, jobId: string): Promise<void> {
  const key = coverJobMetaKey(record.userId, jobId)
  await uploadR2Object(key, Buffer.from(JSON.stringify(record), 'utf8'), 'application/json')
}

export async function readCoverJobMeta(
  userId: string,
  jobId: string,
): Promise<CoverJobRecord | null> {
  try {
    const buf = await downloadR2Object(coverJobMetaKey(userId, jobId))
    return JSON.parse(buf.toString('utf8')) as CoverJobRecord
  } catch {
    return null
  }
}

export async function writeCoverJobImage(
  userId: string,
  jobId: string,
  pngBytes: Buffer,
): Promise<void> {
  await uploadR2Object(coverJobImageKey(userId, jobId), pngBytes, 'image/png')
}

export async function readCoverJobImage(userId: string, jobId: string): Promise<Buffer | null> {
  try {
    return await downloadR2Object(coverJobImageKey(userId, jobId))
  } catch {
    return null
  }
}

export async function deleteCoverJobArtifacts(userId: string, jobId: string): Promise<void> {
  await Promise.all([
    deleteR2Object(coverJobMetaKey(userId, jobId)).catch(() => {}),
    deleteR2Object(coverJobImageKey(userId, jobId)).catch(() => {}),
  ])
}

/** True on Netlify (production, branch, deploy preview) where sync functions cap at ~60s. */
export function shouldUseCoverBackgroundJob(): boolean {
  return process.env.NETLIFY === 'true'
}
