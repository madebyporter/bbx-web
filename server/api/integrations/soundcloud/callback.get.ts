import { deleteCookie, getCookie, getQuery, getRequestURL, sendRedirect } from 'h3'
import {
  exchangeAuthorizationCode,
  fetchSoundCloudMe,
  readSoundCloudConfig,
  saveUserIntegration,
} from '../../../utils/soundcloud'
import { getServiceSupabase } from '../../../utils/supabaseAuth'

function clearOauthCookies(event: Parameters<typeof deleteCookie>[0]) {
  const secure = getRequestURL(event).protocol === 'https:'
  const opts = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' }
  deleteCookie(event, 'sc_oauth_state', opts)
  deleteCookie(event, 'sc_oauth_verifier', opts)
  deleteCookie(event, 'sc_oauth_return', opts)
  deleteCookie(event, 'sc_oauth_uid', opts)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const errorParam = typeof query.error === 'string' ? query.error : ''

  const expectedState = getCookie(event, 'sc_oauth_state')
  const verifier = getCookie(event, 'sc_oauth_verifier')
  const returnTo = getCookie(event, 'sc_oauth_return') || '/'
  const userId = getCookie(event, 'sc_oauth_uid')

  const redirectWithError = (message: string) => {
    clearOauthCookies(event)
    const url = new URL(returnTo, getRequestURL(event).origin)
    url.searchParams.set('sc_sync', 'error')
    url.searchParams.set('sc_message', message)
    return sendRedirect(event, url.pathname + url.search, 302)
  }

  if (errorParam) {
    return redirectWithError(errorParam)
  }

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return redirectWithError('Invalid SoundCloud OAuth state')
  }

  if (!userId) {
    return redirectWithError('SoundCloud connect session expired. Try again.')
  }

  try {
    const config = readSoundCloudConfig()
    const tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: verifier,
      config,
    })
    const me = await fetchSoundCloudMe(tokens.accessToken)
    await saveUserIntegration({ userId, tokens, me })

    // Ensure user still exists
    const supabase = getServiceSupabase()
    await supabase.auth.admin.getUserById(userId)

    clearOauthCookies(event)
    const url = new URL(returnTo, getRequestURL(event).origin)
    url.searchParams.set('sc_sync', 'connected')
    return sendRedirect(event, url.pathname + url.search, 302)
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'statusMessage' in err
        ? String((err as { statusMessage?: string }).statusMessage)
        : err instanceof Error
          ? err.message
          : 'SoundCloud connect failed'
    return redirectWithError(message)
  }
})
