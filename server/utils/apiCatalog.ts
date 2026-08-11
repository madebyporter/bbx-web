export const SITE_ORIGIN = 'https://beatbox.studio'

export const API_CATALOG_PROFILE =
  'https://www.rfc-editor.org/info/rfc9727'

export const API_CATALOG_CONTENT_TYPE =
  `application/linkset+json; profile="${API_CATALOG_PROFILE}"`

export type ApiCatalogId = 'support' | 'storage' | 'resources'

interface LinkTarget {
  href: string
  type: string
}

export interface ApiCatalogEntry {
  id: ApiCatalogId
  anchor: string
  title: string
  summary: string
  'service-desc': LinkTarget[]
  'service-doc': LinkTarget[]
  status: LinkTarget[]
}

export const API_CATALOG_ENTRIES: ApiCatalogEntry[] = [
  {
    id: 'support',
    anchor: `${SITE_ORIGIN}/api/support`,
    title: 'Support',
    summary:
      'Authenticated support submissions (bugs and feedback) with optional image attachments.',
    'service-desc': [
      {
        href: `${SITE_ORIGIN}/openapi/support.json`,
        type: 'application/json',
      },
    ],
    'service-doc': [
      {
        href: `${SITE_ORIGIN}/docs/api/support`,
        type: 'text/markdown',
      },
    ],
    status: [
      {
        href: `${SITE_ORIGIN}/api/health`,
        type: 'application/json',
      },
    ],
  },
  {
    id: 'storage',
    anchor: `${SITE_ORIGIN}/api/storage`,
    title: 'Storage',
    summary:
      'Presigned R2 upload, playback, and delete endpoints for track audio objects.',
    'service-desc': [
      {
        href: `${SITE_ORIGIN}/openapi/storage.json`,
        type: 'application/json',
      },
    ],
    'service-doc': [
      {
        href: `${SITE_ORIGIN}/docs/api/storage`,
        type: 'text/markdown',
      },
    ],
    status: [
      {
        href: `${SITE_ORIGIN}/api/health`,
        type: 'application/json',
      },
    ],
  },
  {
    id: 'resources',
    anchor: `${SITE_ORIGIN}/api/resources`,
    title: 'Resources',
    summary:
      'Resolve or generate product/resource descriptions from a link or product metadata.',
    'service-desc': [
      {
        href: `${SITE_ORIGIN}/openapi/resources.json`,
        type: 'application/json',
      },
    ],
    'service-doc': [
      {
        href: `${SITE_ORIGIN}/docs/api/resources`,
        type: 'text/markdown',
      },
    ],
    status: [
      {
        href: `${SITE_ORIGIN}/api/health`,
        type: 'application/json',
      },
    ],
  },
]

export function buildApiCatalogDocument() {
  return {
    linkset: API_CATALOG_ENTRIES.map((entry) => ({
      anchor: entry.anchor,
      'service-desc': entry['service-desc'],
      'service-doc': entry['service-doc'],
      status: entry.status,
    })),
  }
}

export function getApiCatalogEntry(id: string): ApiCatalogEntry | undefined {
  return API_CATALOG_ENTRIES.find((entry) => entry.id === id)
}

function bearerSecurity() {
  return [
    {
      bearerAuth: [] as string[],
    },
  ]
}

function openApiBase(entry: ApiCatalogEntry) {
  return {
    openapi: '3.1.0',
    info: {
      title: `Beatbox ${entry.title} API`,
      version: '1.0.0',
      description: entry.summary,
    },
    servers: [{ url: SITE_ORIGIN }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase access token from a signed-in Beatbox session.',
        },
      },
    },
  }
}

export function buildOpenApiSpec(id: ApiCatalogId) {
  const entry = getApiCatalogEntry(id)
  if (!entry) return null

  if (id === 'support') {
    return {
      ...openApiBase(entry),
      paths: {
        '/api/support': {
          post: {
            operationId: 'submitSupport',
            summary: 'Submit a bug report or feedback',
            security: bearerSecurity(),
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['type', 'name', 'email', 'subject', 'message'],
                    properties: {
                      type: { type: 'string', enum: ['Bugs', 'Feedback'] },
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      subject: { type: 'string' },
                      message: { type: 'string' },
                      pageUrl: { type: 'string', format: 'uri' },
                    },
                  },
                },
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    required: ['type', 'name', 'email', 'subject', 'message'],
                    properties: {
                      type: { type: 'string', enum: ['Bugs', 'Feedback'] },
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      subject: { type: 'string' },
                      message: { type: 'string' },
                      pageUrl: { type: 'string', format: 'uri' },
                      file: { type: 'string', format: 'binary' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Support submission accepted',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        ok: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
              '401': { description: 'Authentication required' },
              '400': { description: 'Invalid request' },
              '503': { description: 'Support temporarily unavailable' },
            },
          },
        },
      },
    }
  }

  if (id === 'storage') {
    return {
      ...openApiBase(entry),
      paths: {
        '/api/storage/presign-upload': {
          post: {
            operationId: 'presignUpload',
            summary: 'Create a presigned R2 upload URL',
            security: bearerSecurity(),
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['filename'],
                    properties: {
                      filename: { type: 'string' },
                      contentType: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Presigned upload details',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        key: { type: 'string' },
                        uploadUrl: { type: 'string', format: 'uri' },
                        contentType: { type: 'string' },
                        storage_provider: { type: 'string', enum: ['r2'] },
                      },
                    },
                  },
                },
              },
              '401': { description: 'Authentication required' },
            },
          },
        },
        '/api/storage/presign-play': {
          post: {
            operationId: 'presignPlay',
            summary: 'Create a presigned R2 playback URL for a track',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trackId'],
                    properties: {
                      trackId: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Presigned playback URL',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        playbackUrl: { type: 'string', format: 'uri' },
                      },
                    },
                  },
                },
              },
              '404': { description: 'Track not found' },
            },
          },
        },
        '/api/storage/delete-object': {
          post: {
            operationId: 'deleteObject',
            summary: 'Delete an R2 audio object owned by the caller',
            security: bearerSecurity(),
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trackId'],
                    properties: {
                      trackId: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Object deleted',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        ok: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
              '401': { description: 'Authentication required' },
              '403': { description: 'Forbidden' },
            },
          },
        },
      },
    }
  }

  return {
    ...openApiBase(entry),
    paths: {
      '/api/resources/meta-description': {
        post: {
          operationId: 'resolveMetaDescription',
          summary: 'Resolve or generate a resource description',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    name: { type: 'string' },
                    creator: { type: 'string' },
                    tags: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    price: { type: 'string' },
                    optimize: { type: 'boolean' },
                    generateIfMissing: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Resolved description',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      source: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { description: 'URL or product name is required' },
            '422': { description: 'No description available' },
          },
        },
      },
    },
  }
}

export function buildApiDocsMarkdown(id: ApiCatalogId): string | null {
  const entry = getApiCatalogEntry(id)
  const spec = buildOpenApiSpec(id)
  if (!entry || !spec) return null

  const paths = Object.keys(
    (spec as { paths?: Record<string, unknown> }).paths || {},
  )

  const lines = [
    `# Beatbox ${entry.title} API`,
    '',
    entry.summary,
    '',
    `**Anchor:** ${entry.anchor}`,
    '',
    `**OpenAPI:** ${entry['service-desc'][0]?.href}`,
    '',
    `**Status:** ${entry.status[0]?.href}`,
    '',
    '## Endpoints',
    '',
    ...paths.map((path) => `- \`${path}\``),
    '',
    '## Auth',
    '',
    id === 'resources'
      ? 'No authentication is required for meta-description resolution.'
      : 'Send a Supabase bearer access token in the `Authorization` header for authenticated operations.',
    '',
  ]

  return `${lines.join('\n')}\n`
}
