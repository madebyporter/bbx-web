import type { MarkdownRoute } from './routes'
import { buildLandingMarkdown } from './landing'
import { buildResourceMarkdown } from './resource'
import { buildProducerLibraryMarkdown } from './producerLibrary'

export async function renderMarkdownForRoute(route: MarkdownRoute): Promise<string | null> {
  switch (route.type) {
    case 'landing':
      return buildLandingMarkdown()
    case 'resource':
      return buildResourceMarkdown(route.slug, route.kind)
    case 'producer':
      return buildProducerLibraryMarkdown(route.id)
    default:
      return null
  }
}
