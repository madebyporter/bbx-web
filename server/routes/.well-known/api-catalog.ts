import { createError } from 'h3'
import {
  API_CATALOG_CONTENT_TYPE,
  SITE_ORIGIN,
  buildApiCatalogDocument,
} from '../../utils/apiCatalog'

export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const catalogUrl = `${SITE_ORIGIN}/.well-known/api-catalog`

  setHeader(
    event,
    'Link',
    `<${catalogUrl}>; rel="api-catalog"; type="application/linkset+json"`,
  )
  setHeader(event, 'Content-Type', API_CATALOG_CONTENT_TYPE)
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600')

  return buildApiCatalogDocument()
})
