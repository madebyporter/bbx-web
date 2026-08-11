import { createHash } from 'node:crypto'
import { SITE_ORIGIN } from './apiCatalog'

export const AGENT_SKILLS_SCHEMA =
  'https://schemas.agentskills.io/discovery/0.2.0/schema.json'

export type AgentSkillType = 'skill-md' | 'archive'

export interface AgentSkillDefinition {
  name: string
  type: AgentSkillType
  description: string
  /** Exact SKILL.md bytes served at the skill URL (UTF-8). */
  content: string
}

function skillMd(name: string, description: string, body: string): string {
  return `---
name: ${name}
description: ${description}
---

${body.trim()}\n`
}

export const AGENT_SKILL_DEFINITIONS: AgentSkillDefinition[] = [
  {
    name: 'discover-apis',
    type: 'skill-md',
    description:
      'Discover Beatbox HTTP APIs via the RFC 9727 API catalog, OpenAPI specs, docs, and health status.',
    content: skillMd(
      'discover-apis',
      'Discover Beatbox HTTP APIs via the RFC 9727 API catalog, OpenAPI specs, docs, and health status.',
      `
# Discover Beatbox APIs

Use this skill when an agent needs to find or call Beatbox HTTP APIs.

## Steps

1. Fetch \`${SITE_ORIGIN}/.well-known/api-catalog\` (\`Accept: application/linkset+json\`).
2. For each linkset entry, follow \`service-desc\` (OpenAPI), \`service-doc\` (markdown docs), and optional \`status\`.
3. Call authenticated endpoints with \`Authorization: Bearer <access_token>\` when required.

## Key URLs

- API catalog: \`${SITE_ORIGIN}/.well-known/api-catalog\`
- OpenAPI examples: \`${SITE_ORIGIN}/openapi/support.json\`, \`${SITE_ORIGIN}/openapi/storage.json\`, \`${SITE_ORIGIN}/openapi/resources.json\`
- Health: \`${SITE_ORIGIN}/api/health\`
`,
    ),
  },
  {
    name: 'browse-resources',
    type: 'skill-md',
    description:
      'Browse Beatbox software and sounds/kits using HTML pages or Accept: text/markdown content negotiation.',
    content: skillMd(
      'browse-resources',
      'Browse Beatbox software and sounds/kits using HTML pages or Accept: text/markdown content negotiation.',
      `
# Browse Beatbox Resources

Use this skill when an agent needs product catalog content from Beatbox.

## Steps

1. Start from \`${SITE_ORIGIN}/software\` or \`${SITE_ORIGIN}/kits\`.
2. Request detail pages with \`Accept: text/markdown\` to receive curated markdown for agents.
3. Fall back to HTML when markdown is unavailable.

## Notes

- Prefer markdown negotiation for lower-token summaries.
- Public catalog pages do not require authentication.
`,
    ),
  },
  {
    name: 'use-auth-md',
    type: 'skill-md',
    description:
      'Register or authenticate with Beatbox using auth.md, OAuth Protected Resource Metadata, and bearer access tokens.',
    content: skillMd(
      'use-auth-md',
      'Register or authenticate with Beatbox using auth.md, OAuth Protected Resource Metadata, and bearer access tokens.',
      `
# Use Beatbox auth.md

Use this skill when an agent needs credentials for Beatbox APIs.

## Steps

1. Read \`${SITE_ORIGIN}/auth.md\`.
2. Fetch Protected Resource Metadata at \`${SITE_ORIGIN}/.well-known/oauth-protected-resource\`.
3. Fetch Authorization Server / OIDC discovery at \`${SITE_ORIGIN}/.well-known/openid-configuration\` (or \`/.well-known/oauth-authorization-server\`).
4. Follow the verified-email registration guidance in \`agent_auth\`, then present \`Authorization: Bearer <access_token>\`.

## Notes

- Passivebox currently requires a human-verified email account before issuing API credentials.
- Do not invent alternate registration endpoints beyond those advertised in discovery documents.
`,
    ),
  },
]

export function sha256Digest(content: string): string {
  const hex = createHash('sha256').update(content, 'utf8').digest('hex')
  return `sha256:${hex}`
}

export function getAgentSkillDefinition(name: string): AgentSkillDefinition | undefined {
  return AGENT_SKILL_DEFINITIONS.find((skill) => skill.name === name)
}

export function buildAgentSkillsIndex() {
  return {
    $schema: AGENT_SKILLS_SCHEMA,
    skills: AGENT_SKILL_DEFINITIONS.map((skill) => ({
      name: skill.name,
      type: skill.type,
      description: skill.description,
      url: `${SITE_ORIGIN}/.well-known/agent-skills/${skill.name}/SKILL.md`,
      digest: sha256Digest(skill.content),
    })),
  }
}
