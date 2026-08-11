import type { WebMcpModelContext, WebMcpToolDefinition } from '~/types/webmcp'

function getModelContext(): WebMcpModelContext | null {
  if (typeof window === 'undefined') return null

  const fromNavigator = navigator.modelContext
  const fromDocument = document.modelContext

  // Prefer navigator (isitagentready checks this); keep document in sync when needed.
  if (fromNavigator?.registerTool) {
    if (!fromDocument && fromNavigator) {
      try {
        Object.defineProperty(document, 'modelContext', {
          value: fromNavigator,
          configurable: true,
        })
      } catch {
        // ignore non-configurable hosts
      }
    }
    return fromNavigator
  }

  if (fromDocument?.registerTool) {
    try {
      Object.defineProperty(navigator, 'modelContext', {
        value: fromDocument,
        configurable: true,
      })
    } catch {
      // ignore
    }
    return fromDocument
  }

  return null
}

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const controller = new AbortController()
  let registrationStarted = false

  const register = async () => {
    if (registrationStarted || controller.signal.aborted) return
    const modelContext = getModelContext()
    if (!modelContext?.registerTool) return
    registrationStarted = true

    const tools: WebMcpToolDefinition[] = [
      {
        name: 'search_site',
        title: 'Search Beatbox',
        description:
          'Search Beatbox for software, sounds/kits, tracks, or collections and navigate to the results experience.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query text',
            },
            scope: {
              type: 'string',
              enum: ['all', 'software', 'kits'],
              description: 'Optional catalog scope to bias navigation',
            },
          },
          required: ['query'],
        },
        annotations: { readOnlyHint: true },
        async execute(input) {
          const query = String(input.query || '').trim()
          if (!query) return { ok: false, error: 'query is required' }

          const scope = String(input.scope || 'all')
          if (scope === 'software') {
            await router.push({ path: '/software', query: { q: query } })
            return { ok: true, path: '/software', query }
          }
          if (scope === 'kits') {
            await router.push({ path: '/kits', query: { q: query } })
            return { ok: true, path: '/kits', query }
          }

          // Open the in-app search experience via a custom event SearchFilter listens for,
          // and keep a navigable fallback on the homepage.
          window.dispatchEvent(
            new CustomEvent('webmcp-search', { detail: { query } }),
          )
          await router.push({ path: '/', query: { q: query } })
          return { ok: true, path: '/', query }
        },
      },
      {
        name: 'navigate_to',
        title: 'Navigate',
        description:
          'Navigate within Beatbox to a known path such as /, /software, /kits, or a resource detail URL.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Site-relative path beginning with /',
            },
          },
          required: ['path'],
        },
        annotations: { readOnlyHint: true },
        async execute(input) {
          const path = String(input.path || '').trim()
          if (!path.startsWith('/')) {
            return { ok: false, error: 'path must start with /' }
          }
          await router.push(path)
          return { ok: true, path }
        },
      },
      {
        name: 'get_current_page',
        title: 'Current page',
        description: 'Return the current Beatbox URL, route path, and document title.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        annotations: { readOnlyHint: true },
        async execute() {
          return {
            ok: true,
            href: window.location.href,
            path: router.currentRoute.value.fullPath,
            title: document.title,
          }
        },
      },
      {
        name: 'list_catalog_sections',
        title: 'List catalog sections',
        description:
          'List primary Beatbox catalog sections agents can browse (software and sounds/kits).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        annotations: { readOnlyHint: true },
        async execute() {
          return {
            ok: true,
            sections: [
              {
                id: 'software',
                name: 'Software',
                path: '/software',
                description: 'Curated music production software directory',
              },
              {
                id: 'kits',
                name: 'Sounds & Kits',
                path: '/kits',
                description: 'Curated sounds and sample kits directory',
              },
            ],
          }
        },
      },
      {
        name: 'fetch_api_catalog',
        title: 'Fetch API catalog',
        description:
          'Retrieve Beatbox RFC 9727 API catalog JSON for machine-readable API discovery.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        annotations: { readOnlyHint: true },
        async execute() {
          const response = await fetch('/.well-known/api-catalog', {
            headers: { Accept: 'application/linkset+json, application/json' },
          })
          if (!response.ok) {
            return { ok: false, status: response.status }
          }
          const catalog = await response.json()
          return { ok: true, catalog }
        },
      },
    ]

    for (const tool of tools) {
      await modelContext.registerTool(tool, { signal: controller.signal })
    }
  }

  nuxtApp.hook('app:mounted', () => {
    void register()
  })

  // Also try immediately in case the host already exposed modelContext before mount.
  void register()

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      controller.abort()
    })
  }
})
