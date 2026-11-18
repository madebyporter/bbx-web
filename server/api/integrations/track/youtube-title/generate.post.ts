import { readBody } from 'h3'
import { requireAuthUser } from '../../../../utils/supabaseAuth'

/** Same short-copy model as sync description generate. */
const OPENAI_MODEL = 'gpt-5.4-nano'
const MAX_YOUTUBE_TITLE_CHARS = 100

function readOpenAiKey(): string {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.NUXT_OPENAI_API_KEY?.trim() ||
    ''
  )
}

function trimOrEmpty(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)

  const body = await readBody<{
    title?: string
    artist?: string
    genre?: string
    mood?: string | string[]
    bpm?: number | null
    key?: string
    description?: string
  }>(event)

  const title = trimOrEmpty(body?.title)
  const artist = trimOrEmpty(body?.artist)
  if (!title || !artist) {
    throw createError({
      statusCode: 400,
      statusMessage: 'title and artist are required',
    })
  }

  const apiKey = readOpenAiKey()
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'OPENAI_API_KEY is not configured',
    })
  }

  const genre = trimOrEmpty(body?.genre)
  const key = trimOrEmpty(body?.key)
  const description = trimOrEmpty(body?.description)
  const bpm =
    body?.bpm != null && Number.isFinite(Number(body.bpm))
      ? Math.round(Number(body.bpm))
      : null
  const moods = Array.isArray(body?.mood)
    ? body.mood.map((m) => trimOrEmpty(m)).filter(Boolean)
    : trimOrEmpty(body?.mood)
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)

  const contextLines = [
    `Beatbox title: ${title}`,
    `Artist: ${artist}`,
    genre ? `Genre: ${genre}` : null,
    bpm != null ? `BPM: ${bpm}` : null,
    key ? `Key: ${key}` : null,
    moods.length ? `Mood: ${moods.join(', ')}` : null,
    description ? `Description: ${description.slice(0, 400)}` : null,
  ].filter(Boolean)

  const systemPrompt =
    'You write SEO-optimized YouTube music video titles for producers and artists. ' +
    'Return ONE title only — plain text, no quotes, no hashtags, no emoji spam. ' +
    `Hard limit ${MAX_YOUTUBE_TITLE_CHARS} characters (YouTube max). Prefer under 70 when possible. ` +
    'Include searchable cues when natural (genre, type beat, vibe, BPM, or “Official Audio”) without keyword stuffing. ' +
    'Keep the track name recognizable. Do not invent collabs, labels, or chart claims.'

  const userPrompt =
    `Write the best YouTube title for this track using its metadata:\n${contextLines.join('\n')}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      max_completion_tokens: 80,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  const text = await response.text()
  let json: {
    error?: { message?: string }
    choices?: Array<{ message?: { content?: string } }>
  } = {}
  try {
    json = text ? (JSON.parse(text) as typeof json) : {}
  } catch {
    json = {}
  }

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage:
        json.error?.message ||
        text.slice(0, 220) ||
        `OpenAI YouTube title failed (${response.status})`,
    })
  }

  const raw = json.choices?.[0]?.message?.content?.trim() || ''
  const youtubeTitle = raw
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_YOUTUBE_TITLE_CHARS)

  if (!youtubeTitle) {
    throw createError({
      statusCode: 502,
      statusMessage: 'OpenAI did not return a YouTube title',
    })
  }

  return {
    youtube_title: youtubeTitle,
    model: OPENAI_MODEL,
  }
})
