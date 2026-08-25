import { appendVaryAccept, prefersMarkdown } from '../utils/markdown/accept'
import { matchMarkdownRoute } from '../utils/markdown/routes'
import { renderMarkdownForRoute } from '../utils/markdown/render'
import { estimateMarkdownTokens } from '../utils/markdown/tokens'
import { getHeader, setHeader, setResponseStatus } from 'h3'

export default defineEventHandler(async (event) => {
  const route = matchMarkdownRoute(event.path)
  if (!route) return

  const ua = getHeader(event, 'user-agent') || ''
  const isSocialBot = /Twitterbot|facebookexternalhit|Facebot|LinkedInBot|Slackbot|Discordbot/i.test(ua)

  // Social crawlers need stable HTML; do not advertise Accept negotiation to them
  if (!isSocialBot) {
    appendVaryAccept(event)
  }

  if (isSocialBot || !prefersMarkdown(event)) return

  const markdown = await renderMarkdownForRoute(route)
  if (!markdown) {
    setResponseStatus(event, 404, 'Not Found')
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return 'Not Found'
  }

  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setHeader(event, 'x-markdown-tokens', String(estimateMarkdownTokens(markdown)))
  return markdown
})
