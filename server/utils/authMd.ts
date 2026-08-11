import { SITE_ORIGIN } from './apiCatalog'

export const AUTH_MD_PATH = '/auth.md'
export const OAUTH_PRM_PATH = '/.well-known/oauth-protected-resource'
export const OAUTH_AS_PATH = '/.well-known/oauth-authorization-server'
export const AGENT_REGISTER_PATH = '/agent/auth'
export const AGENT_CLAIM_PATH = '/agent/auth/claim'

const SCOPES_SUPPORTED = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'api',
] as const

function supabaseAuthBase(): string {
  try {
    const config = useRuntimeConfig()
    const base = String(config.public.supabaseUrl || '').replace(/\/$/, '')
    return base ? `${base}/auth/v1` : ''
  } catch {
    return ''
  }
}

export function buildProtectedResourceMetadata() {
  return {
    resource: `${SITE_ORIGIN}/`,
    resource_name: 'Beatbox',
    authorization_servers: [SITE_ORIGIN],
    scopes_supported: [...SCOPES_SUPPORTED],
    bearer_methods_supported: ['header'],
  }
}

export interface AuthorizationServerMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  revocation_endpoint: string
  jwks_uri?: string
  response_types_supported: string[]
  grant_types_supported: string[]
  scopes_supported: string[]
  token_endpoint_auth_methods_supported: string[]
  agent_auth: {
    skill: string
    register_uri: string
    claim_uri: string
    identity_types_supported: string[]
    identity_assertion: {
      assertion_types_supported: string[]
      credential_types_supported: string[]
      claim_uri: string
    }
  }
}

export function buildAuthorizationServerMetadata(): AuthorizationServerMetadata {
  const supabaseAuth = supabaseAuthBase()

  const metadata: AuthorizationServerMetadata = {
    issuer: SITE_ORIGIN,
    authorization_endpoint: `${SITE_ORIGIN}/`,
    token_endpoint: supabaseAuth
      ? `${supabaseAuth}/token`
      : `${SITE_ORIGIN}/oauth2/token`,
    revocation_endpoint: supabaseAuth
      ? `${supabaseAuth}/logout`
      : `${SITE_ORIGIN}/oauth2/revoke`,
    response_types_supported: ['code', 'token'],
    grant_types_supported: [
      'password',
      'refresh_token',
      'authorization_code',
    ],
    scopes_supported: [...SCOPES_SUPPORTED],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    agent_auth: {
      skill: `${SITE_ORIGIN}${AUTH_MD_PATH}`,
      register_uri: `${SITE_ORIGIN}${AGENT_REGISTER_PATH}`,
      claim_uri: `${SITE_ORIGIN}${AGENT_CLAIM_PATH}`,
      identity_types_supported: ['identity_assertion'],
      identity_assertion: {
        assertion_types_supported: ['verified_email'],
        credential_types_supported: ['access_token'],
        claim_uri: `${SITE_ORIGIN}${AGENT_CLAIM_PATH}`,
      },
    },
  }

  if (supabaseAuth) {
    metadata.jwks_uri = `${supabaseAuth}/.well-known/jwks.json`
  }

  return metadata
}

export function buildAuthMdMarkdown(): string {
  const prm = buildProtectedResourceMetadata()
  const as = buildAuthorizationServerMetadata()

  return `# auth.md

Beatbox supports agent registration discovery for AI agents acting on behalf of human producers and creators.

- **Resource server:** \`${SITE_ORIGIN}\`
- **Authorization server issuer:** \`${as.issuer}\`
- **Protected Resource Metadata (OAuth):** \`${SITE_ORIGIN}${OAUTH_PRM_PATH}\`
- **Authorization Server metadata:** \`${SITE_ORIGIN}${OAUTH_AS_PATH}\`
- **API catalog:** \`${SITE_ORIGIN}/.well-known/api-catalog\`

Treat the Protected Resource Metadata document as authoritative if anything here conflicts with it.

## 1. Discover

Two-hop OAuth discovery:

1. On \`401 Unauthorized\`, read \`WWW-Authenticate: Bearer resource_metadata="…"\` when present, otherwise fetch \`${SITE_ORIGIN}${OAUTH_PRM_PATH}\`.
2. From PRM, read \`resource\`, \`authorization_servers\`, \`scopes_supported\`, and \`bearer_methods_supported\` (\`header\`).
3. Fetch \`${SITE_ORIGIN}${OAUTH_AS_PATH}\` and read \`issuer\`, \`token_endpoint\`, \`grant_types_supported\`, and the \`agent_auth\` block (\`skill\`, \`register_uri\`, \`claim_uri\`, identity types).

Current PRM summary:

\`\`\`json
${JSON.stringify(prm, null, 2)}
\`\`\`

## 2. Supported flows

Beatbox currently supports the **verified email** registration flow for agents:

| Agent has | Method |
| --- | --- |
| A human-verified Beatbox account email + password | \`identity_assertion\` with \`verified_email\` |
| No account yet | Human signup / email confirmation at \`${SITE_ORIGIN}/\`, then the verified-email method |

ID-JAG and anonymous agent registration are not enabled.

## 3. Registration

### verified_email

1. Ensure a human has completed Beatbox signup and confirmed email (or already has an account).
2. Call the registration discovery endpoint:

\`\`\`http
POST ${SITE_ORIGIN}${AGENT_REGISTER_PATH} HTTP/1.1
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "type": "identity_assertion",
  "assertion_type": "verified_email",
  "login_hint": "user@example.com",
  "requested_credential_type": "access_token"
}
\`\`\`

3. Beatbox returns \`interaction_required\` with a \`verification_uri\` for the human claim ceremony when automated issuance is not available.
4. After the human account exists, obtain an access token from the \`token_endpoint\` using the verified email credentials (password grant / Supabase Auth session), then call APIs with the bearer token.

Claim ceremony materials (when needed):

\`\`\`http
POST ${SITE_ORIGIN}${AGENT_CLAIM_PATH} HTTP/1.1
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "login_hint": "user@example.com"
}
\`\`\`

## 4. Scopes

| Scope | Description |
| --- | --- |
| \`openid\` | OpenID subject identifier |
| \`email\` | Account email |
| \`profile\` | Profile fields (username / display name) |
| \`offline_access\` | Refresh token when issued by the auth server |
| \`api\` | Call Beatbox authenticated HTTP APIs (support, storage, etc.) |

## 5. Credential use

Present the access token on every protected request:

\`\`\`http
GET ${SITE_ORIGIN}/api/health HTTP/1.1
Authorization: Bearer <access_token>
\`\`\`

\`bearer_methods_supported\` is \`header\` only.

When the access token expires, refresh via the auth server refresh grant when available, or re-authenticate with the verified email credentials. On \`invalid_grant\` / \`401\`, restart at discovery.

## 6. OAuth links

- Protected Resource Metadata: \`${SITE_ORIGIN}${OAUTH_PRM_PATH}\`
- Authorization Server metadata: \`${SITE_ORIGIN}${OAUTH_AS_PATH}\`
- Agent skill (this file): \`${SITE_ORIGIN}${AUTH_MD_PATH}\`
- Register URI: \`${as.agent_auth.register_uri}\`
- Claim URI: \`${as.agent_auth.claim_uri}\`

## 7. Errors

| Code | Meaning | Agent action |
| --- | --- | --- |
| \`interaction_required\` | Human verification / signup needed | Open \`verification_uri\`, complete email confirmation, retry token exchange |
| \`invalid_grant\` | Credentials or refresh token rejected | Restart registration / sign-in |
| \`401 Unauthorized\` | Missing or expired bearer token | Re-discover and obtain a new access token |
`
}

export function buildAgentRegistrationResponse() {
  return {
    error: 'interaction_required',
    error_description:
      'Beatbox requires a human-verified email account before issuing API credentials. Complete signup and email confirmation at the verification_uri, then obtain an access_token from the token_endpoint.',
    verification_uri: `${SITE_ORIGIN}/`,
    claim_uri: `${SITE_ORIGIN}${AGENT_CLAIM_PATH}`,
    token_endpoint: buildAuthorizationServerMetadata().token_endpoint,
    docs: `${SITE_ORIGIN}${AUTH_MD_PATH}`,
    resource_metadata: `${SITE_ORIGIN}${OAUTH_PRM_PATH}`,
  }
}

export function buildAgentClaimResponse() {
  return {
    error: 'interaction_required',
    error_description:
      'Complete the human claim ceremony by signing up or signing in at Beatbox, then confirm the account email. Agents do not receive OTP codes over email from this endpoint.',
    verification_uri: `${SITE_ORIGIN}/`,
    user_code: null,
    docs: `${SITE_ORIGIN}${AUTH_MD_PATH}`,
  }
}

export function oauthResourceMetadataWwwAuthenticate(): string {
  return `Bearer resource_metadata="${SITE_ORIGIN}${OAUTH_PRM_PATH}"`
}
