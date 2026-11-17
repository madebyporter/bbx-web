import { deleteCookie, getCookie, getQuery, getRequestURL, sendRedirect } from 'h3'
import {
  exchangeGoogleAuthorizationCode,
  fetchYouTubeChannel,
  readGoogleOAuthConfig,
  resolveGoogleRedirectUri,
  saveYouTubeIntegration,
} from '../../../utils/youtube'
import { getServiceSupabase } from '../../../utils/supabaseAuth'

function clearOauthCookies(event: Parameters<typeof deleteCookie>[0]) {
  const secure = getRequestURL(event).protocol === 'https:'
  const opts = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' }
  deleteCookie(event, 'yt_oauth_state', opts)
  deleteCookie(event, 'yt_oauth_verifier', opts)
  deleteCookie(event, 'yt_oauth_return', opts)
  deleteCookie(event, 'yt_oauth_uid', opts)
  deleteCookie(event, 'yt_oauth_redirect', opts)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const errorParam = typeof query.error === 'string' ? query.error : ''

  const expectedState = getCookie(event, 'yt_oauth_state')
  const verifier = getCookie(event, 'yt_oauth_verifier')
  const returnTo = getCookie(event, 'yt_oauth_return') || '/'
  const userId = getCookie(event, 'yt_oauth_uid')
  const requestUrl = getRequestURL(event)
  const redirectUri =
    getCookie(event, 'yt_oauth_redirect') || resolveGoogleRedirectUri(requestUrl.origin)

  const redirectWithError = (message: string) => {
    clearOauthCookies(event)
    const url = new URL(returnTo, requestUrl.origin)
    url.searchParams.set('yt_sync', 'error')
    url.searchParams.set('yt_message', message)
    return sendRedirect(event, url.pathname + url.search, 302)
  }

  if (errorParam) return redirectWithError(errorParam)

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return redirectWithError('Invalid YouTube OAuth state')
  }

  if (!userId) {
    return redirectWithError('YouTube connect session expired. Try again.')
  }

  try {
    const config = readGoogleOAuthConfig(redirectUri)
    const tokens = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier: verifier,
      config,
    })
    const channel = await fetchYouTubeChannel(tokens.accessToken)
    await saveYouTubeIntegration({ userId, tokens, channel })

    const supabase = getServiceSupabase()
    await supabase.auth.admin.getUserById(userId)

    clearOauthCookies(event)
    const url = new URL(returnTo, requestUrl.origin)
    url.searchParams.set('yt_sync', 'connected')
    return sendRedirect(event, url.pathname + url.search, 302)
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'statusMessage' in err
        ? String((err as { statusMessage?: string }).statusMessage)
        : err instanceof Error
          ? err.message
          : 'YouTube connect failed'
    return redirectWithError(message)
  }
})
