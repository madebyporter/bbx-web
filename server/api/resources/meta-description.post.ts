import { createError, readBody } from 'h3'
import { fetchMetaDescription } from '../../utils/fetchMetaDescription'

interface MetaDescriptionBody {
  url?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<MetaDescriptionBody>(event)
  const url = body?.url?.trim()

  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'URL is required' })
  }

  const result = await fetchMetaDescription(url)

  if (result.description) {
    return { description: result.description }
  }

  throw createError({
    statusCode: 422,
    statusMessage: ('error' in result && result.error) || 'No meta description found',
  })
})
