import { createError, readBody } from 'h3'
import { resolveResourceDescription } from '../../utils/resolveResourceDescription'

interface MetaDescriptionBody {
  url?: string
  name?: string
  creator?: string
  tags?: string[]
  price?: string
  optimize?: boolean
  generateIfMissing?: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody<MetaDescriptionBody>(event)
  const url = body?.url?.trim()

  if (!url && !body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'URL or product name is required' })
  }

  const tags = Array.isArray(body?.tags)
    ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : undefined

  const result = await resolveResourceDescription(url, {
    name: body?.name?.trim() || undefined,
    creator: body?.creator?.trim() || undefined,
    price: body?.price?.trim() || undefined,
    tags,
    optimize: body?.optimize,
    generateIfMissing: body?.generateIfMissing,
  })

  if (result.description) {
    return {
      description: result.description,
      source: result.source,
    }
  }

  throw createError({
    statusCode: 422,
    statusMessage: ('error' in result && result.error) || 'No description available',
  })
})
