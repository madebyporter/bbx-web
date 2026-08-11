import { SITE_ORIGIN } from './apiCatalog'

export function buildA2AAgentCard() {
  return {
    name: 'Beatbox',
    description:
      'Project management for music producers — organize tracks, share collections, and discover curated production tools via agent-readable APIs and content.',
    version: '1.0.0',
    protocolVersion: '1.0',
    provider: {
      organization: 'Beatbox',
      url: SITE_ORIGIN,
    },
    supportedInterfaces: [
      {
        url: `${SITE_ORIGIN}/a2a`,
        protocolBinding: 'HTTP+JSON',
        protocolVersion: '1.0',
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: false,
    },
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['application/json', 'text/markdown', 'text/plain'],
    skills: [
      {
        id: 'discover-apis',
        name: 'Discover APIs',
        description:
          'Find Beatbox HTTP APIs via the RFC 9727 API catalog, OpenAPI specs, and auth.md registration guidance.',
        tags: ['discovery', 'api', 'openapi'],
        examples: [
          'Where is the Beatbox API catalog?',
          'How do I authenticate to Beatbox APIs?',
        ],
        inputModes: ['text/plain'],
        outputModes: ['application/json', 'text/markdown'],
      },
      {
        id: 'browse-resources',
        name: 'Browse resources',
        description:
          'Read curated software and sounds/kits listings and detail pages, including Accept: text/markdown negotiation for agents.',
        tags: ['catalog', 'software', 'kits', 'markdown'],
        examples: [
          'List recent music production software on Beatbox',
          'Summarize a software product page as markdown',
        ],
        inputModes: ['text/plain'],
        outputModes: ['text/markdown', 'text/html'],
      },
      {
        id: 'health-check',
        name: 'Health check',
        description: 'Check Beatbox service availability via the public health endpoint.',
        tags: ['status', 'health'],
        examples: ['Is Beatbox up?'],
        inputModes: ['text/plain'],
        outputModes: ['application/json'],
      },
    ],
    securitySchemes: {
      bearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    security: [{ bearer: [] }],
  }
}
