import { getQuery, getRequestURL, setCookie } from 'h3'
import { randomBytes } from 'node:crypto'
import { requireTrackSyncUser } from '../../../utils/integrationAuth'
import { createPkcePair } from '../../../utils/oauthPkce'
import { buildAuthorizeUrl, readSoundCloudConfig } from '../../../utils/soundcloud'

export default defineEventHandler(async (event) => {
  const { user } = await requireTrackSyncUser(event)
  const config = readSoundCloudConfig()
  const { verifier, challenge } = createPkcePair()
  const state = randomBytes(16).toString('base64url')

  const returnTo = getQuery(event).return_to
  const safeReturn =
    typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : '/'

  const secure = getRequestURL(event).protocol === 'https:'
  const cookieOpts = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10,
  }

  setCookie(event, 'sc_oauth_state', state, cookieOpts)
  setCookie(event, 'sc_oauth_verifier', verifier, cookieOpts)
  setCookie(event, 'sc_oauth_return', safeReturn, cookieOpts)
  setCookie(event, 'sc_oauth_uid', user.id, cookieOpts)

  const authorizeUrl = buildAuthorizeUrl({
    state,
    challenge,
    redirectUri: config.redirectUri,
    clientId: config.clientId,
  })

  return { authorizeUrl }
})
