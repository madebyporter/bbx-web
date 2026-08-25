/**
 * Strip invalid Set-Cookie headers (literal "undefined") emitted during Nuxt SSR.
 * Runs on both render:response and beforeResponse — Netlify/Nitro can attach
 * cookies via either path, and a malformed header confuses social crawlers.
 */
function cleanSetCookieHeader(value: string | number | string[] | undefined): string[] | null {
  if (value == null) return null
  const values = Array.isArray(value) ? value : [value]
  const cleaned = values
    .map((v) => String(v).trim())
    .filter((v) => {
      if (!v || v === 'undefined' || v === 'null') return false
      return v.includes('=')
    })
  return cleaned
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    if (!response?.headers) return
    const headers = response.headers as Record<string, string | string[] | undefined>
    const key = Object.keys(headers).find((k) => k.toLowerCase() === 'set-cookie')
    if (!key) return
    const cleaned = cleanSetCookieHeader(headers[key])
    if (!cleaned || cleaned.length === 0) {
      delete headers[key]
    } else {
      headers[key] = cleaned.length === 1 ? cleaned[0]! : cleaned
    }
  })

  nitroApp.hooks.hook('beforeResponse', (event) => {
    try {
      const raw = getResponseHeader(event, 'set-cookie')
      const cleaned = cleanSetCookieHeader(raw as string | string[] | undefined)
      if (cleaned == null) return
      if (cleaned.length === 0) {
        removeResponseHeader(event, 'set-cookie')
        return
      }
      setResponseHeader(event, 'set-cookie', cleaned)
    } catch {
      // ignore — never block responses
    }
  })
})
