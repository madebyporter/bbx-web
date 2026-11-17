import { getQuery, getRequestURL, setCookie } from 'h3'
import { randomBytes } from 'node:crypto'
import { requireTrackSyncUser } from '../../../utils/integrationAuth'
import { createPkcePair } from '../../../utils/oauthPkce'
import {
  buildGoogleAuthorizeUrl,
  readGoogleOAuthConfig,
  resolveGoogleRedirectUri,
} from '../../../utils/youtube'

export default defineEventHandler(async (event) => {
  const { user } = await requireTrackSyncUser(event)
  const requestUrl = getRequestURL(event)
  const redirectUri = resolveGoogleRedirectUri(requestUrl.origin)
  const config = readGoogleOAuthConfig(redirectUri)
  const { verifier, challenge } = createPkcePair()
  const state = randomBytes(16).toString('base64url')

  const returnTo = getQuery(event).return_to
  const safeReturn =
    typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : '/'

  const secure = requestUrl.protocol === 'https:'
  const cookieOpts = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10,
  }

  setCookie(event, 'yt_oauth_state', state, cookieOpts)
  setCookie(event, 'yt_oauth_verifier', verifier, cookieOpts)
  setCookie(event, 'yt_oauth_return', safeReturn, cookieOpts)
  setCookie(event, 'yt_oauth_uid', user.id, cookieOpts)
  // Must match authorize redirect_uri exactly on token exchange
  setCookie(event, 'yt_oauth_redirect', redirectUri, cookieOpts)

  const authorizeUrl = buildGoogleAuthorizeUrl({
    state,
    challenge,
    redirectUri,
    clientId: config.clientId,
  })

  return { authorizeUrl, redirectUri }
})
