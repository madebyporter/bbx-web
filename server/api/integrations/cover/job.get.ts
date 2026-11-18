import { getQuery } from 'h3'
import {
  readCoverJobImage,
  readCoverJobMeta,
} from '../../../utils/coverJobs'
import { requireAuthUser } from '../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const jobId = String(query.jobId || '').trim()

  if (!jobId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'jobId is required',
    })
  }

  const meta = await readCoverJobMeta(user.id, jobId)
  if (!meta || meta.userId !== user.id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Cover job not found',
    })
  }

  if (meta.status === 'pending') {
    return { jobId, status: 'pending' as const }
  }

  if (meta.status === 'failed') {
    return {
      jobId,
      status: 'failed' as const,
      error: meta.error || 'Cover generation failed',
    }
  }

  const image = await readCoverJobImage(user.id, jobId)
  if (!image) {
    return {
      jobId,
      status: 'failed' as const,
      error: 'Cover image missing from storage',
    }
  }

  return {
    jobId,
    status: 'ready' as const,
    mimeType: meta.mimeType || 'image/png',
    base64: image.toString('base64'),
    filename: 'cover-ai.png',
    provider: meta.provider,
    model: meta.model,
  }
})
