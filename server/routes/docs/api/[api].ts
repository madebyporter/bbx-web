import { createError } from 'h3'
import {
  type ApiCatalogId,
  buildApiDocsMarkdown,
  getApiCatalogEntry,
} from '../../../utils/apiCatalog'

const VALID_IDS = new Set<ApiCatalogId>(['support', 'storage', 'resources'])

export default defineEventHandler((event) => {
  const api = getRouterParam(event, 'api') || ''
  if (!VALID_IDS.has(api as ApiCatalogId) || !getApiCatalogEntry(api)) {
    throw createError({ statusCode: 404, statusMessage: 'API docs not found' })
  }

  const markdown = buildApiDocsMarkdown(api as ApiCatalogId)
  if (!markdown) {
    throw createError({ statusCode: 404, statusMessage: 'API docs not found' })
  }

  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600')
  return markdown
})
