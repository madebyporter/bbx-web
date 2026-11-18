/**
 * Netlify Background Function — AI cover generation (up to ~15 minutes).
 * Invoked by POST /api/integrations/cover/generate when NETLIFY=true.
 * Client polls GET /api/integrations/cover/job?jobId=…
 *
 * Filename ends with -background → platform returns 202 immediately and continues work.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const OPENAI_COVER_MODEL = 'gpt-image-2.6-flare'
const OPENAI_COVER_MODEL_QUALITY = 'gpt-image-2.6-sunburst'
const GROK_COVER_MODEL = 'grok-imagine-image-2.0'
const MAX_COVER_DIRECTION_CHARS = 8000

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || ''
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error('R2 configuration missing')
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  })
}

function r2Bucket() {
  const bucket = process.env.R2_BUCKET?.trim()
  if (!bucket) throw new Error('R2_BUCKET is not configured')
  return bucket
}

async function putR2(key, body, contentType) {
  const client = getR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

function metaKey(userId, jobId) {
  return `cover-jobs/${userId}/${jobId}.json`
}

function imageKey(userId, jobId) {
  return `cover-jobs/${userId}/${jobId}.png`
}

async function writeMeta(userId, jobId, record) {
  await putR2(metaKey(userId, jobId), Buffer.from(JSON.stringify(record), 'utf8'), 'application/json')
}

function readSecret() {
  return process.env.COVER_JOB_SECRET?.trim() || process.env.CRON_SECRET?.trim() || ''
}

function buildCoverPrompt({ title, artist, genre, mood, direction }) {
  const parts = [
    `Square album cover artwork for the song "${title}" by ${artist}.`,
    'This is commercial music packaging art only: tasteful, non-sexual, fully clothed if people appear, no nudity, no lingerie, no suggestive poses.',
  ]
  if (direction) {
    parts.push(
      `Visual concept for the cover (interpret as SFW album art, not a photo shoot): ${direction}.`,
    )
  }
  if (genre) parts.push(`Genre mood: ${genre}.`)
  if (mood) parts.push(`Feeling: ${mood}.`)
  parts.push(
    'Dark cinematic music cover, high contrast, atmospheric, suitable for electronic/hip-hop production.',
    'No watermarks, no logos, no cluttered typography, no UI chrome.',
    'Avoid purple-on-white gradients and cream terracotta newspaper looks.',
  )
  return parts.join(' ')
}

async function parseImageResponse(response, providerLabel) {
  const text = await response.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = {}
  }

  if (!response.ok) {
    const errObj = json.error
    const raw =
      (typeof errObj === 'object' && errObj?.message) ||
      (typeof errObj === 'string' && errObj) ||
      text.slice(0, 500) ||
      `${providerLabel} image generation failed (${response.status})`
    throw new Error(String(raw))
  }

  const first = json.data?.[0]
  if (first?.b64_json) {
    return { base64: first.b64_json, mimeType: 'image/png' }
  }
  if (first?.url) {
    const imageRes = await fetch(first.url)
    if (!imageRes.ok) throw new Error(`Failed to download ${providerLabel} cover image`)
    const buffer = Buffer.from(await imageRes.arrayBuffer())
    return { base64: buffer.toString('base64'), mimeType: 'image/png' }
  }
  throw new Error(`${providerLabel} did not return an image`)
}

async function generateOpenAi(prompt, model) {
  const apiKey = process.env.OPENAI_KEY_VISUAL?.trim() || ''
  if (!apiKey) throw new Error('OPENAI_KEY_VISUAL is not configured')
  const openaiModel =
    model === OPENAI_COVER_MODEL_QUALITY ? OPENAI_COVER_MODEL_QUALITY : OPENAI_COVER_MODEL
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openaiModel,
      prompt,
      size: '1024x1024',
      n: 1,
      output_format: 'png',
    }),
  })
  const result = await parseImageResponse(response, 'OpenAI')
  return { ...result, provider: 'openai', model: openaiModel }
}

async function generateGrok(prompt) {
  const apiKey =
    process.env.GROK_KEY_VISUAL?.trim() || process.env.XAI_API_KEY?.trim() || ''
  if (!apiKey) throw new Error('GROK_KEY_VISUAL (or XAI_API_KEY) is not configured')
  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROK_COVER_MODEL,
      prompt,
      n: 1,
      aspect_ratio: '1:1',
      resolution: '1k',
      response_format: 'b64_json',
    }),
  })
  const result = await parseImageResponse(response, 'Grok')
  return { ...result, provider: 'grok', model: GROK_COVER_MODEL }
}

function isSafetyRejection(raw) {
  const lower = String(raw).toLowerCase()
  return (
    lower.includes('safety') ||
    lower.includes('safety_violations') ||
    lower.includes('rejected by the safety system') ||
    lower.includes('content_policy') ||
    lower.includes('content policy')
  )
}

async function generateCover(params) {
  const direction = params.direction
    ? String(params.direction).trim().slice(0, MAX_COVER_DIRECTION_CHARS)
    : undefined
  const prompt = buildCoverPrompt({
    title: params.title,
    artist: params.artist,
    genre: params.genre,
    mood: params.mood,
    direction,
  })

  const hasOpenAi = Boolean(process.env.OPENAI_KEY_VISUAL?.trim())
  const hasGrok = Boolean(
    process.env.GROK_KEY_VISUAL?.trim() || process.env.XAI_API_KEY?.trim(),
  )
  if (!hasOpenAi && !hasGrok) {
    throw new Error('No cover generation providers configured')
  }

  const requested = params.model
  const useGrok =
    requested === GROK_COVER_MODEL || (!hasOpenAi && hasGrok)

  if (useGrok) {
    return generateGrok(prompt)
  }

  try {
    return await generateOpenAi(prompt, requested)
  } catch (err) {
    if (isSafetyRejection(err?.message || '') && hasGrok) {
      return generateGrok(prompt)
    }
    throw err
  }
}

export const handler = async (event) => {
  const expected = readSecret()
  const headers = event.headers || {}
  const provided =
    headers['x-cover-job-secret'] ||
    headers['X-Cover-Job-Secret'] ||
    ''

  if (!expected || provided !== expected) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  let body = {}
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  const jobId = String(body.jobId || '').trim()
  const userId = String(body.userId || '').trim()
  const title = String(body.title || '').trim()
  const artist = String(body.artist || '').trim()
  const createdAt = new Date().toISOString()

  if (!jobId || !userId || !title || !artist) {
    return {
      statusCode: 400,
      body: 'jobId, userId, title, and artist are required',
    }
  }

  try {
    const result = await generateCover({
      title,
      artist,
      genre: body.genre ? String(body.genre).trim() : undefined,
      mood: body.mood ? String(body.mood).trim() : undefined,
      direction: body.direction ? String(body.direction).trim() : undefined,
      model: body.model,
    })

    const png = Buffer.from(result.base64, 'base64')
    await putR2(imageKey(userId, jobId), png, 'image/png')
    await writeMeta(userId, jobId, {
      status: 'ready',
      userId,
      createdAt,
      updatedAt: new Date().toISOString(),
      mimeType: result.mimeType || 'image/png',
      provider: result.provider,
      model: result.model,
    })
  } catch (err) {
    const message = err?.message || String(err) || 'Cover generation failed'
    console.error('cover-generate-background failed:', message)
    try {
      await writeMeta(userId, jobId, {
        status: 'failed',
        userId,
        createdAt,
        updatedAt: new Date().toISOString(),
        error: String(message).slice(0, 1000),
      })
    } catch (writeErr) {
      console.error('Failed to write cover job failure meta:', writeErr)
    }
  }

  // Background functions discard the response body after the initial 202.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, jobId }),
  }
}
