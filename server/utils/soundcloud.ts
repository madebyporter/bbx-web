import { createError } from 'h3'
import { decryptSecret, encryptSecret } from './integrationCrypto'
import { getServiceSupabase } from './supabaseAuth'

export const SOUNDCLOUD_PROVIDER = 'soundcloud' as const

const AUTH_BASE = 'https://secure.soundcloud.com'
const API_BASE = 'https://api.soundcloud.com'

export interface SoundCloudConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface SoundCloudTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string | null
}

export interface SoundCloudMe {
  id: string | number
  username?: string
  permalink_url?: string
}

export function readSoundCloudConfig(): SoundCloudConfig {
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID?.trim() || ''
  const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET?.trim() || ''
  const redirectUri =
    process.env.SOUNDCLOUD_REDIRECT_URI?.trim() ||
    (process.env.SITE_URL
      ? `${process.env.SITE_URL.replace(/\/$/, '')}/api/integrations/soundcloud/callback`
      : '')

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({
      statusCode: 503,
      statusMessage: 'SoundCloud integration is not configured',
    })
  }

  return { clientId, clientSecret, redirectUri }
}

export function buildAuthorizeUrl(params: {
  state: string
  challenge: string
  redirectUri: string
  clientId: string
}): string {
  const url = new URL(`${AUTH_BASE}/authorize`)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('code_challenge', params.challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', params.state)
  return url.toString()
}

async function tokenRequest(body: Record<string, string>): Promise<SoundCloudTokens> {
  const response = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json; charset=utf-8',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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
      'SoundCloud token exchange failed'
    throw createError({ statusCode: 502, statusMessage: message })
  }

  const accessToken = String(json.access_token || '')
  if (!accessToken) {
    throw createError({ statusCode: 502, statusMessage: 'SoundCloud did not return an access token' })
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
    scopes: json.scope ? String(json.scope) : null,
  }
}

export async function exchangeAuthorizationCode(params: {
  code: string
  codeVerifier: string
  config: SoundCloudConfig
}): Promise<SoundCloudTokens> {
  return tokenRequest({
    grant_type: 'authorization_code',
    client_id: params.config.clientId,
    client_secret: params.config.clientSecret,
    redirect_uri: params.config.redirectUri,
    code_verifier: params.codeVerifier,
    code: params.code,
  })
}

export async function refreshAccessToken(params: {
  refreshToken: string
  config: SoundCloudConfig
}): Promise<SoundCloudTokens> {
  return tokenRequest({
    grant_type: 'refresh_token',
    client_id: params.config.clientId,
    client_secret: params.config.clientSecret,
    refresh_token: params.refreshToken,
  })
}

export async function fetchSoundCloudMe(accessToken: string): Promise<SoundCloudMe> {
  const response = await fetch(`${API_BASE}/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `OAuth ${accessToken}`,
    },
  })
  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Failed to load SoundCloud profile (${response.status})`,
    })
  }
  return (await response.json()) as SoundCloudMe
}

export async function saveUserIntegration(params: {
  userId: string
  tokens: SoundCloudTokens
  me: SoundCloudMe
}): Promise<void> {
  const supabase = getServiceSupabase()
  const row = {
    user_id: params.userId,
    provider: SOUNDCLOUD_PROVIDER,
    access_token_enc: encryptSecret(params.tokens.accessToken),
    refresh_token_enc: params.tokens.refreshToken
      ? encryptSecret(params.tokens.refreshToken)
      : null,
    expires_at: params.tokens.expiresAt?.toISOString() ?? null,
    provider_user_id: String(params.me.id),
    provider_username: params.me.username ?? null,
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
      statusMessage: `Failed to save SoundCloud connection: ${error.message}`,
    })
  }
}

export async function deleteUserIntegration(userId: string): Promise<void> {
  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', SOUNDCLOUD_PROVIDER)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to disconnect SoundCloud: ${error.message}`,
    })
  }
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('user_integrations')
    .select('access_token_enc, refresh_token_enc, expires_at')
    .eq('user_id', userId)
    .eq('provider', SOUNDCLOUD_PROVIDER)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load SoundCloud connection: ${error.message}`,
    })
  }

  if (!data?.access_token_enc) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SoundCloud is not connected',
    })
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : null
  const stillValid = !expiresAt || expiresAt > Date.now() + 60_000

  if (stillValid) {
    return decryptSecret(data.access_token_enc)
  }

  if (!data.refresh_token_enc) {
    throw createError({
      statusCode: 401,
      statusMessage: 'SoundCloud session expired. Reconnect SoundCloud.',
    })
  }

  const config = readSoundCloudConfig()
  const refreshed = await refreshAccessToken({
    refreshToken: decryptSecret(data.refresh_token_enc),
    config,
  })

  const { data: me } = await supabase
    .from('user_integrations')
    .select('provider_user_id, provider_username')
    .eq('user_id', userId)
    .eq('provider', SOUNDCLOUD_PROVIDER)
    .maybeSingle()

  await saveUserIntegration({
    userId,
    tokens: {
      ...refreshed,
      refreshToken: refreshed.refreshToken || decryptSecret(data.refresh_token_enc),
    },
    me: {
      id: me?.provider_user_id || 'unknown',
      username: me?.provider_username || undefined,
    },
  })

  return refreshed.accessToken
}

export interface SoundCloudTrackResult {
  id: string | number
  permalink_url?: string
  urn?: string
}

export async function uploadTrackToSoundCloud(params: {
  accessToken: string
  fields: {
    title: string
    artist: string
    genre?: string
    tagList: string
    description: string
    sharing: 'public' | 'private'
    releaseDate?: string
  }
  audio: { buffer: Buffer; filename: string; contentType: string }
  artwork?: { buffer: Buffer; filename: string; contentType: string } | null
}): Promise<SoundCloudTrackResult> {
  const form = new FormData()
  form.append('track[title]', params.fields.title)
  form.append('track[artist]', params.fields.artist)
  form.append('track[sharing]', params.fields.sharing)
  form.append('track[description]', params.fields.description)
  if (params.fields.genre) form.append('track[genre]', params.fields.genre)
  if (params.fields.tagList) form.append('track[tag_list]', params.fields.tagList)
  if (params.fields.releaseDate) form.append('track[release_date]', params.fields.releaseDate)

  const audioBlob = new Blob([new Uint8Array(params.audio.buffer)], {
    type: params.audio.contentType,
  })
  form.append('track[asset_data]', audioBlob, params.audio.filename)

  if (params.artwork) {
    const artBlob = new Blob([new Uint8Array(params.artwork.buffer)], {
      type: params.artwork.contentType,
    })
    form.append('track[artwork_data]', artBlob, params.artwork.filename)
  }

  const response = await fetch(`${API_BASE}/tracks`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `OAuth ${params.accessToken}`,
    },
    body: form,
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
      (typeof json.error === 'object' &&
        json.error &&
        typeof (json.error as { message?: string }).message === 'string' &&
        (json.error as { message: string }).message) ||
      (typeof json.message === 'string' && json.message) ||
      text.slice(0, 300) ||
      `SoundCloud upload failed (${response.status})`
    throw createError({ statusCode: 502, statusMessage: message })
  }

  return {
    id: (json.id as string | number) ?? (json.urn as string),
    permalink_url: json.permalink_url ? String(json.permalink_url) : undefined,
    urn: json.urn ? String(json.urn) : undefined,
  }
}

export async function updateSoundCloudTrackMetadata(params: {
  accessToken: string
  trackId: string
  fields: {
    title: string
    artist: string
    genre?: string
    tagList: string
    description: string
    sharing: 'public' | 'private'
    releaseDate?: string
  }
  artwork?: { buffer: Buffer; filename: string; contentType: string } | null
}): Promise<SoundCloudTrackResult> {
  const form = new FormData()
  form.append('track[title]', params.fields.title)
  form.append('track[description]', params.fields.description)
  form.append('track[sharing]', params.fields.sharing)
  if (params.fields.genre) form.append('track[genre]', params.fields.genre)
  if (params.fields.tagList) form.append('track[tag_list]', params.fields.tagList)
  if (params.fields.releaseDate) form.append('track[release_date]', params.fields.releaseDate)

  // Artist on update uses metadata_artist per SoundCloud docs
  form.append('track[metadata_artist]', params.fields.artist)

  if (params.artwork) {
    const artBlob = new Blob([new Uint8Array(params.artwork.buffer)], {
      type: params.artwork.contentType,
    })
    form.append('track[artwork_data]', artBlob, params.artwork.filename)
  }

  const response = await fetch(`${API_BASE}/tracks/${encodeURIComponent(params.trackId)}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      Authorization: `OAuth ${params.accessToken}`,
    },
    body: form,
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
      (typeof json.message === 'string' && json.message) ||
      text.slice(0, 300) ||
      `SoundCloud update failed (${response.status})`
    throw createError({ statusCode: 502, statusMessage: message })
  }

  return {
    id: (json.id as string | number) ?? params.trackId,
    permalink_url: json.permalink_url ? String(json.permalink_url) : undefined,
    urn: json.urn ? String(json.urn) : undefined,
  }
}
