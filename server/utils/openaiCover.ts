import { createError } from 'h3'

export const OPENAI_COVER_MODEL = 'gpt-image-2.6-flare'
/** Higher-detail OpenAI Images 2.6 variant. */
export const OPENAI_COVER_MODEL_QUALITY = 'gpt-image-2.6-sunburst'
/** Latest xAI image model (two micros back only when micro versions exist; this is the current GA image model). */
export const GROK_COVER_MODEL = 'grok-imagine-image-2.0'

export type CoverProvider = 'openai' | 'grok'

export type CoverModelId =
  | typeof OPENAI_COVER_MODEL
  | typeof OPENAI_COVER_MODEL_QUALITY
  | typeof GROK_COVER_MODEL

export type CoverModelOption = {
  id: CoverModelId
  label: string
  provider: CoverProvider
  hint: string
}

/** Models offered in Sync / cover UI (latest OpenAI 2.6 + Grok Imagine 2.0). */
export const COVER_MODEL_OPTIONS: CoverModelOption[] = [
  {
    id: OPENAI_COVER_MODEL,
    label: 'GPT Image 2.6 Flare',
    provider: 'openai',
    hint: 'Faster OpenAI cover',
  },
  {
    id: OPENAI_COVER_MODEL_QUALITY,
    label: 'GPT Image 2.6 Sunburst',
    provider: 'openai',
    hint: 'Higher-detail OpenAI cover',
  },
  {
    id: GROK_COVER_MODEL,
    label: 'Grok Imagine 2.0',
    provider: 'grok',
    hint: 'xAI image model',
  },
]

export function isCoverModelId(value: unknown): value is CoverModelId {
  return COVER_MODEL_OPTIONS.some((m) => m.id === value)
}

export function listAvailableCoverModels(): CoverModelOption[] {
  return COVER_MODEL_OPTIONS.filter((m) =>
    m.provider === 'openai' ? hasOpenAiCoverKey() : hasGrokCoverKey(),
  )
}

function readOpenAiKey(): string {
  // Dedicated visual key — do not fall back to OPENAI_API_KEY (used for text/TTS)
  return process.env.OPENAI_KEY_VISUAL?.trim() || ''
}

function readXaiKey(): string {
  // Prefer dedicated visual key (matches OPENAI_KEY_VISUAL naming); XAI_API_KEY as fallback
  return process.env.GROK_KEY_VISUAL?.trim() || process.env.XAI_API_KEY?.trim() || ''
}

export function hasOpenAiCoverKey(): boolean {
  return Boolean(readOpenAiKey())
}

export function hasGrokCoverKey(): boolean {
  return Boolean(readXaiKey())
}

/** Soft cap for cover direction prompts — effectively unlimited for UI; protects request size. */
export const MAX_COVER_DIRECTION_CHARS = 8000

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

export function isSafetyRejection(raw: string): boolean {
  const lower = raw.toLowerCase()
  return (
    lower.includes('safety') ||
    lower.includes('safety_violations') ||
    lower.includes('rejected by the safety system') ||
    lower.includes('content_policy') ||
    lower.includes('content policy')
  )
}

/** Map OpenAI safety / API errors into short UI copy. */
export function formatCoverGenerationError(raw: string): string {
  if (isSafetyRejection(raw)) {
    return 'Cover was blocked by OpenAI’s safety filter. Rephrase direction to clear album-art language (no body/pose focus) and try again.'
  }
  return raw.slice(0, 300)
}

async function parseImageResponse(
  response: Response,
  providerLabel: string,
): Promise<{ base64: string; mimeType: string }> {
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
      `${providerLabel} image generation failed (${response.status})`
    const error = new Error(String(raw)) as Error & { statusCode?: number; rawMessage?: string }
    error.statusCode = response.status
    error.rawMessage = String(raw)
    throw error
  }

  const data = json.data as Array<{ b64_json?: string; url?: string }> | undefined
  const first = data?.[0]
  if (first?.b64_json) {
    return { base64: first.b64_json, mimeType: 'image/png' }
  }

  if (first?.url) {
    const imageRes = await fetch(first.url)
    if (!imageRes.ok) {
      throw new Error(`Failed to download ${providerLabel} cover image`)
    }
    const buffer = Buffer.from(await imageRes.arrayBuffer())
    return { base64: buffer.toString('base64'), mimeType: 'image/png' }
  }

  throw new Error(`${providerLabel} did not return an image`)
}

async function generateOpenAiCover(
  prompt: string,
  model: CoverModelId = OPENAI_COVER_MODEL,
): Promise<{ base64: string; mimeType: string }> {
  const apiKey = readOpenAiKey()
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'OPENAI_KEY_VISUAL is not configured',
    })
  }

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

  return parseImageResponse(response, 'OpenAI')
}

async function generateGrokCover(prompt: string): Promise<{ base64: string; mimeType: string }> {
  const apiKey = readXaiKey()
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'GROK_KEY_VISUAL (or XAI_API_KEY) is not configured',
    })
  }

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

  return parseImageResponse(response, 'Grok')
}

export async function generateCoverImageBase64(params: {
  title: string
  artist: string
  genre?: string
  mood?: string
  direction?: string
  /** Preferred model; defaults to OpenAI Flare when available. */
  model?: CoverModelId
}): Promise<{ base64: string; mimeType: string; provider: CoverProvider; model: CoverModelId }> {
  const direction = params.direction
    ? params.direction.trim().slice(0, MAX_COVER_DIRECTION_CHARS)
    : undefined

  const prompt = buildCoverPrompt({
    title: params.title,
    artist: params.artist,
    genre: params.genre,
    mood: params.mood,
    direction: direction || undefined,
  })

  const available = listAvailableCoverModels()
  if (!available.length) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No cover generation providers configured',
    })
  }

  const requested =
    params.model && isCoverModelId(params.model) && available.some((m) => m.id === params.model)
      ? params.model
      : available[0]!.id

  const option = COVER_MODEL_OPTIONS.find((m) => m.id === requested)!

  if (option.provider === 'grok') {
    try {
      const result = await generateGrokCover(prompt)
      return { ...result, provider: 'grok', model: GROK_COVER_MODEL }
    } catch (err: unknown) {
      const rawMessage =
        (err as { rawMessage?: string })?.rawMessage ||
        (err instanceof Error ? err.message : String(err))
      if ((err as { statusCode?: number })?.statusCode === 503) throw err
      throw createError({
        statusCode: 502,
        statusMessage: formatCoverGenerationError(rawMessage),
      })
    }
  }

  try {
    const result = await generateOpenAiCover(prompt, requested)
    return { ...result, provider: 'openai', model: requested }
  } catch (err: unknown) {
    const rawMessage =
      (err as { rawMessage?: string })?.rawMessage ||
      (err instanceof Error ? err.message : String(err))

    const canFallback =
      isSafetyRejection(rawMessage) &&
      hasGrokCoverKey() &&
      available.some((m) => m.id === GROK_COVER_MODEL)
    if (!canFallback) {
      if ((err as { statusCode?: number })?.statusCode === 503) throw err
      throw createError({
        statusCode: 502,
        statusMessage: formatCoverGenerationError(rawMessage),
      })
    }

    try {
      const result = await generateGrokCover(prompt)
      return { ...result, provider: 'grok', model: GROK_COVER_MODEL }
    } catch (grokErr: unknown) {
      const grokRaw =
        (grokErr as { rawMessage?: string })?.rawMessage ||
        (grokErr instanceof Error ? grokErr.message : String(grokErr))
      throw createError({
        statusCode: 502,
        statusMessage: `OpenAI blocked the cover; Grok fallback also failed: ${String(grokRaw).slice(0, 220)}`,
      })
    }
  }
}
