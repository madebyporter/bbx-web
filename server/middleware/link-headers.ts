import { buildHomepageLinkHeaderValue } from '../utils/apiCatalog'

function isHomepagePath(path: string): boolean {
  return path === '/' || path === ''
}

export default defineEventHandler((event) => {
  if (!isHomepagePath(event.path)) return
  if (event.method !== 'GET' && event.method !== 'HEAD') return

  setHeader(event, 'Link', buildHomepageLinkHeaderValue())
})
