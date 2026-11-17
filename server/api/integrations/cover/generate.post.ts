import { readBody } from 'h3'
import { generateCoverImageBase64 } from '../../../utils/openaiCover'
import { requireAuthUser } from '../../../utils/supabaseAuth'

const MAX_DIRECTION_CHARS = 500

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const body = await readBody<{
    title?: string
    artist?: string
    genre?: string
    mood?: string
    direction?: string
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
    ? directionRaw.slice(0, MAX_DIRECTION_CHARS)
    : undefined

  const { base64, mimeType } = await generateCoverImageBase64({
    title,
    artist,
    genre: genre || undefined,
    mood: mood || undefined,
    direction: direction || undefined,
  })

  return {
    mimeType,
    base64,
    filename: 'cover-ai.png',
  }
})
