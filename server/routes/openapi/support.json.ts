import { buildOpenApiSpec } from '../../utils/apiCatalog'

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600')
  return buildOpenApiSpec('support')
})
