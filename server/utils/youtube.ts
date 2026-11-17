import { createError } from 'h3'
import { decryptSecret, encryptSecret } from './integrationCrypto'
import { getServiceSupabase } from './supabaseAuth'

export const YOUTUBE_PROVIDER = 'youtube' as const
/** upload alone cannot call channels.list — readonly is required for Connect profile lookup */
export const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload'
export const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
export const YOUTUBE_OAUTH_SCOPES = `${YOUTUBE_UPLOAD_SCOPE} ${YOUTUBE_READONLY_SCOPE}`

const AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels'

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string | null
}

export interface YouTubeChannelMe {
  id: string
  title?: string
}

export function readGoogleOAuthConfig(redirectUriOverride?: string): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || ''
  const redirectUri =
    redirectUriOverride?.trim() ||
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    (process.env.SITE_URL
      ? `${process.env.SITE_URL.replace(/\/$/, '')}/api/integrations/youtube/callback`
      : '')

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({
      statusCode: 503,
      statusMessage: 'YouTube / Google OAuth is not configured',
    })
  }

  return { clientId, clientSecret, redirectUri }
}

/** Prefer the current request origin so local Connect never uses production redirect. */
export function resolveGoogleRedirectUri(requestOrigin: string): string {
  try {
    const origin = new URL(requestOrigin).origin
    const host = new URL(origin).hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${origin}/api/integrations/youtube/callback`
    }
  } catch {
    // fall through
  }

  const fromEnv = process.env.GOOGLE_REDIRECT_URI?.trim()
  if (fromEnv) return fromEnv

  return `${requestOrigin.replace(/\/$/, '')}/api/integrations/youtube/callback`
}

export function buildGoogleAuthorizeUrl(params: {
  state: string
  challenge: string
  redirectUri: string
  clientId: string
}): string {
  const url = new URL(AUTH_BASE)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', YOUTUBE_OAUTH_SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('code_challenge', params.challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', params.state)
  return url.toString()
}

async function tokenRequest(body: Record<string, string>): Promise<GoogleTokens> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })

  const text = await response.text()
  let json: Record<string, unknown> = {}
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    json = {}
  }

  if (!response.ok) {
    const message =
      (typeof json.error_description === 'string' && json.error_description) ||
      (typeof json.error === 'string' && json.error) ||
      text ||
      'Google token exchange failed'
    throw createError({ statusCode: 502, statusMessage: message })
  }

  const accessToken = String(json.access_token || '')
  if (!accessToken) {
    throw createError({ statusCode: 502, statusMessage: 'Google did not return an access token' })
  }

  const expiresIn = Number(json.expires_in)
  const expiresAt =
    Number.isFinite(expiresIn) && expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000)
      : null

  return {
    accessToken,
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    expiresAt,
    scopes: json.scope ? String(json.scope) : YOUTUBE_OAUTH_SCOPES,
  }
}

export async function exchangeGoogleAuthorizationCode(params: {
  code: string
  codeVerifier: string
  config: GoogleOAuthConfig
}): Promise<GoogleTokens> {
  return tokenRequest({
    grant_type: 'authorization_code',
    client_id: params.config.clientId,
    client_secret: params.config.clientSecret,
    redirect_uri: params.config.redirectUri,
    code_verifier: params.codeVerifier,
    code: params.code,
  })
}

export async function refreshGoogleAccessToken(params: {
  refreshToken: string
  config: GoogleOAuthConfig
}): Promise<GoogleTokens> {
  return tokenRequest({
    grant_type: 'refresh_token',
    client_id: params.config.clientId,
    client_secret: params.config.clientSecret,
    refresh_token: params.refreshToken,
  })
}

export async function fetchYouTubeChannel(accessToken: string): Promise<YouTubeChannelMe> {
  const url = new URL(CHANNELS_URL)
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('mine', 'true')

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const needsApi =
      response.status === 403 &&
      (body.includes('accessNotConfigured') || body.includes('has not been used'))
    throw createError({
      statusCode: 502,
      statusMessage: needsApi
        ? 'Enable YouTube Data API v3 on your Google Cloud project, then reconnect'
        : `Failed to load YouTube channel (${response.status})`,
    })
  }

  const json = (await response.json()) as {
    items?: Array<{ id?: string; snippet?: { title?: string } }>
  }
  const item = json.items?.[0]
  if (!item?.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No YouTube channel found for this Google account',
    })
  }

  return { id: item.id, title: item.snippet?.title }
}

export async function saveYouTubeIntegration(params: {
  userId: string
  tokens: GoogleTokens
  channel: YouTubeChannelMe
}): Promise<void> {
  const supabase = getServiceSupabase()
  const row = {
    user_id: params.userId,
    provider: YOUTUBE_PROVIDER,
    access_token_enc: encryptSecret(params.tokens.accessToken),
    refresh_token_enc: params.tokens.refreshToken
      ? encryptSecret(params.tokens.refreshToken)
      : null,
    expires_at: params.tokens.expiresAt?.toISOString() ?? null,
    provider_user_id: params.channel.id,
    provider_username: params.channel.title ?? null,
    scopes: params.tokens.scopes,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('user_integrations').upsert(row, {
    onConflict: 'user_id,provider',
  })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save YouTube connection: ${error.message}`,
    })
  }
}

export async function deleteYouTubeIntegration(userId: string): Promise<void> {
  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', YOUTUBE_PROVIDER)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to disconnect YouTube: ${error.message}`,
    })
  }
}

export async function getValidYouTubeAccessToken(userId: string): Promise<string> {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('user_integrations')
    .select('access_token_enc, refresh_token_enc, expires_at, provider_user_id, provider_username')
    .eq('user_id', userId)
    .eq('provider', YOUTUBE_PROVIDER)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load YouTube connection: ${error.message}`,
    })
  }

  if (!data?.access_token_enc) {
    throw createError({ statusCode: 400, statusMessage: 'YouTube is not connected' })
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : null
  const stillValid = !expiresAt || expiresAt > Date.now() + 60_000

  if (stillValid) {
    return decryptSecret(data.access_token_enc)
  }

  if (!data.refresh_token_enc) {
    throw createError({
      statusCode: 401,
      statusMessage: 'YouTube session expired. Reconnect YouTube.',
    })
  }

  const config = readGoogleOAuthConfig()
  const refreshed = await refreshGoogleAccessToken({
    refreshToken: decryptSecret(data.refresh_token_enc),
    config,
  })

  await saveYouTubeIntegration({
    userId,
    tokens: {
      ...refreshed,
      refreshToken: refreshed.refreshToken || decryptSecret(data.refresh_token_enc),
    },
    channel: {
      id: data.provider_user_id || 'unknown',
      title: data.provider_username || undefined,
    },
  })

  return refreshed.accessToken
}
