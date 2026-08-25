/**
 * Strip invalid Set-Cookie headers (literal "undefined") that Nuxt/useCookie can emit
 * during SSR. Malformed Set-Cookie confuses some crawlers including Twitterbot.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    const raw = event.node.res.getHeader('set-cookie')
    if (raw == null) return

    const values = Array.isArray(raw) ? raw : [raw]
    const cleaned = values
      .map((v) => String(v))
      .filter((v) => {
        const trimmed = v.trim()
        if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false
        // Real cookies are name=value; reject header values with no "="
        return trimmed.includes('=')
      })

    if (cleaned.length === 0) {
      event.node.res.removeHeader('set-cookie')
      return
    }

    if (cleaned.length !== values.length) {
      event.node.res.setHeader('set-cookie', cleaned)
    }
  })
})
