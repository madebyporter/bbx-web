import { buildAuthMdMarkdown } from '../utils/authMd'

export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') {
    setResponseStatus(event, 405, 'Method Not Allowed')
    return 'Method Not Allowed'
  }

  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600')
  return buildAuthMdMarkdown()
})
