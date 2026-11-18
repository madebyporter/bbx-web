import { readBody } from 'h3'
import { requireAuthUser } from '../../../../utils/supabaseAuth'

/** Latest text model used elsewhere for short copy; nano is enough for sync blurbs. */
const OPENAI_MODEL = 'gpt-5.4-nano'
const MAX_DESCRIPTION_CHARS = 2000

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
    `Title: ${title}`,
    `Artist: ${artist}`,
    genre ? `Genre: ${genre}` : null,
    bpm != null ? `BPM: ${bpm}` : null,
    key ? `Key: ${key}` : null,
    moods.length ? `Mood: ${moods.join(', ')}` : null,
  ].filter(Boolean)

  const systemPrompt =
    'You write short music track descriptions for SoundCloud and YouTube uploads. ' +
    '2–4 sentences, plain text, no hashtags, no emoji spam, no URLs. ' +
    'Sound confident and specific. Do not invent guest features or chart claims.'

  const userPrompt = `Write a sync description for this track:\n${contextLines.join('\n')}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.5,
      max_completion_tokens: 280,
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
        `OpenAI description failed (${response.status})`,
    })
  }

  const description = json.choices?.[0]?.message?.content?.trim() || ''
  if (!description) {
    throw createError({
      statusCode: 502,
      statusMessage: 'OpenAI did not return a description',
    })
  }

  return {
    description: description.slice(0, MAX_DESCRIPTION_CHARS),
    model: OPENAI_MODEL,
  }
})
