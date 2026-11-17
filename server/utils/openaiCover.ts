import { createError } from 'h3'

export const OPENAI_COVER_MODEL = 'gpt-image-2.6-flare'

function readOpenAiKey(): string {
  // Dedicated visual key — do not fall back to OPENAI_API_KEY (used for text/TTS)
  return process.env.OPENAI_KEY_VISUAL?.trim() || ''
}

export function hasOpenAiCoverKey(): boolean {
  return Boolean(readOpenAiKey())
}

const MAX_DIRECTION_CHARS = 500

export function buildCoverPrompt(params: {
  title: string
  artist: string
  genre?: string
  mood?: string
  direction?: string
}): string {
  const parts = [
    `Square album cover artwork for the song "${params.title}" by ${params.artist}.`,
    'This is commercial music packaging art only: tasteful, non-sexual, fully clothed if people appear, no nudity, no lingerie, no suggestive poses.',
  ]
  if (params.direction) {
    parts.push(
      `Visual concept for the cover (interpret as SFW album art, not a photo shoot): ${params.direction}.`,
    )
  }
  if (params.genre) parts.push(`Genre mood: ${params.genre}.`)
  if (params.mood) parts.push(`Feeling: ${params.mood}.`)
  parts.push(
    'Dark cinematic music cover, high contrast, atmospheric, suitable for electronic/hip-hop production.',
    'No watermarks, no logos, no cluttered typography, no UI chrome.',
    'Avoid purple-on-white gradients and cream terracotta newspaper looks.',
  )
  return parts.join(' ')
}

/** Map OpenAI safety / API errors into short UI copy. */
export function formatCoverGenerationError(raw: string): string {
  const lower = raw.toLowerCase()
  if (
    lower.includes('safety') ||
    lower.includes('safety_violations') ||
    lower.includes('rejected by the safety system')
  ) {
    return 'Cover was blocked by OpenAI’s safety filter. Rephrase direction to clear album-art language (no body/pose focus) and try again.'
  }
  return raw.slice(0, 300)
}

export async function generateCoverImageBase64(params: {
  title: string
  artist: string
  genre?: string
  mood?: string
  direction?: string
}): Promise<{ base64: string; mimeType: string }> {
  const apiKey = readOpenAiKey()
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'OPENAI_KEY_VISUAL is not configured',
    })
  }

  const direction = params.direction
    ? params.direction.trim().slice(0, MAX_DIRECTION_CHARS)
    : undefined

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_COVER_MODEL,
      prompt: buildCoverPrompt({
        title: params.title,
        artist: params.artist,
        genre: params.genre,
        mood: params.mood,
        direction: direction || undefined,
      }),
      size: '1024x1024',
      n: 1,
      output_format: 'png',
    }),
  })

  const text = await response.text()
  let json: Record<string, unknown> = {}
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    json = {}
  }

  if (!response.ok) {
    const errObj = json.error as { message?: string } | string | undefined
    const raw =
      (typeof errObj === 'object' && errObj?.message) ||
      (typeof errObj === 'string' && errObj) ||
      text.slice(0, 500) ||
      `OpenAI image generation failed (${response.status})`
    throw createError({
      statusCode: 502,
      statusMessage: formatCoverGenerationError(String(raw)),
    })
  }

  const data = json.data as Array<{ b64_json?: string; url?: string }> | undefined
  const first = data?.[0]
  if (first?.b64_json) {
    return { base64: first.b64_json, mimeType: 'image/png' }
  }

  if (first?.url) {
    const imageRes = await fetch(first.url)
    if (!imageRes.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Failed to download generated cover image',
      })
    }
    const buffer = Buffer.from(await imageRes.arrayBuffer())
    return { base64: buffer.toString('base64'), mimeType: 'image/png' }
  }

  throw createError({
    statusCode: 502,
    statusMessage: 'OpenAI did not return an image',
  })
}
