import { createError } from 'h3'

export const OPENAI_COVER_MODEL = 'gpt-image-2.6-flare'

function readOpenAiKey(): string {
  // Dedicated visual key — do not fall back to OPENAI_API_KEY (used for text/TTS)
  return process.env.OPENAI_KEY_VISUAL?.trim() || ''
}

export function hasOpenAiCoverKey(): boolean {
  return Boolean(readOpenAiKey())
}

export function buildCoverPrompt(params: {
  title: string
  artist: string
  genre?: string
  mood?: string
}): string {
  const parts = [
    `Square album cover art for the track "${params.title}" by ${params.artist}.`,
    'Dark cinematic music cover, high contrast, atmospheric, suitable for electronic/hip-hop production.',
    'No watermarks, no logos, no cluttered typography, no UI chrome.',
    'Avoid purple-on-white gradients and cream terracotta newspaper looks.',
  ]
  if (params.genre) parts.push(`Genre mood: ${params.genre}.`)
  if (params.mood) parts.push(`Feeling: ${params.mood}.`)
  return parts.join(' ')
}

export async function generateCoverImageBase64(params: {
  title: string
  artist: string
  genre?: string
  mood?: string
}): Promise<{ base64: string; mimeType: string }> {
  const apiKey = readOpenAiKey()
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'OPENAI_KEY_VISUAL is not configured',
    })
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_COVER_MODEL,
      prompt: buildCoverPrompt(params),
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
    const message =
      (typeof errObj === 'object' && errObj?.message) ||
      (typeof errObj === 'string' && errObj) ||
      text.slice(0, 300) ||
      `OpenAI image generation failed (${response.status})`
    throw createError({ statusCode: 502, statusMessage: message })
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
