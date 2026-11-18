import { getRequestURL, readBody } from 'h3'
import {
  generateCoverImageBase64,
  isCoverModelId,
  MAX_COVER_DIRECTION_CHARS,
  type CoverModelId,
} from '../../../utils/openaiCover'
import {
  readCoverJobSecret,
  shouldUseCoverBackgroundJob,
  writeCoverJobImage,
  writeCoverJobMeta,
  type CoverJobRecord,
} from '../../../utils/coverJobs'
import { requireAuthUser } from '../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<{
    title?: string
    artist?: string
    genre?: string
    mood?: string
    direction?: string
    model?: string
  }>(event)

  const title = String(body?.title || '').trim()
  const artist = String(body?.artist || '').trim()
  if (!title || !artist) {
    throw createError({
      statusCode: 400,
      statusMessage: 'title and artist are required',
    })
  }

  const genre = body?.genre ? String(body.genre).trim() : undefined
  const mood = body?.mood ? String(body.mood).trim() : undefined
  const directionRaw = body?.direction ? String(body.direction).trim() : ''
  const direction = directionRaw
    ? directionRaw.slice(0, MAX_COVER_DIRECTION_CHARS)
    : undefined
  const model: CoverModelId | undefined = isCoverModelId(body?.model)
    ? body.model
    : undefined

  const jobId = crypto.randomUUID()
  const now = new Date().toISOString()
  const pending: CoverJobRecord = {
    status: 'pending',
    userId: user.id,
    createdAt: now,
    updatedAt: now,
  }
  await writeCoverJobMeta(pending, jobId)

  const payload = {
    jobId,
    userId: user.id,
    title,
    artist,
    genre: genre || undefined,
    mood: mood || undefined,
    direction: direction || undefined,
    model: model || undefined,
  }

  // Local / non-Netlify: run inline (no 60s gateway). Netlify: background function (≤15 min).
  if (!shouldUseCoverBackgroundJob()) {
    try {
      const result = await generateCoverImageBase64(payload)
      const png = Buffer.from(result.base64, 'base64')
      await writeCoverJobImage(user.id, jobId, png)
      await writeCoverJobMeta(
        {
          status: 'ready',
          userId: user.id,
          createdAt: now,
          updatedAt: new Date().toISOString(),
          mimeType: result.mimeType || 'image/png',
          provider: result.provider,
          model: result.model,
        },
        jobId,
      )
    } catch (err: unknown) {
      const message =
        (err as { statusMessage?: string })?.statusMessage ||
        (err instanceof Error ? err.message : 'Cover generation failed')
      await writeCoverJobMeta(
        {
          status: 'failed',
          userId: user.id,
          createdAt: now,
          updatedAt: new Date().toISOString(),
          error: String(message).slice(0, 1000),
        },
        jobId,
      )
    }

    return { jobId, status: 'pending' as const }
  }

  const secret = readCoverJobSecret()
  if (!secret) {
    await writeCoverJobMeta(
      {
        status: 'failed',
        userId: user.id,
        createdAt: now,
        updatedAt: new Date().toISOString(),
        error: 'COVER_JOB_SECRET (or CRON_SECRET) is not configured',
      },
      jobId,
    )
    throw createError({
      statusCode: 503,
      statusMessage: 'Cover background jobs are not configured (COVER_JOB_SECRET / CRON_SECRET)',
    })
  }

  const origin = getRequestURL(event).origin
  const bgUrl = `${origin}/.netlify/functions/cover-generate-background`

  // Do not await completion — background function returns 202 and keeps working.
  const invoke = fetch(bgUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cover-job-secret': secret,
    },
    body: JSON.stringify(payload),
  }).catch(async (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Failed to start cover job'
    await writeCoverJobMeta(
      {
        status: 'failed',
        userId: user.id,
        createdAt: now,
        updatedAt: new Date().toISOString(),
        error: message.slice(0, 1000),
      },
      jobId,
    )
  })

  // Kick off without blocking the response (still observe invoke errors via catch above)
  void invoke

  return { jobId, status: 'pending' as const }
})
