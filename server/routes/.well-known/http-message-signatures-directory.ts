import { createError, getRequestURL } from 'h3'
import {
  WEB_BOT_AUTH_MEDIA_TYPE,
  buildWebBotAuthDirectory,
  signWebBotAuthDirectoryResponse,
} from '../../utils/webBotAuth'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const body = JSON.stringify(buildWebBotAuthDirectory())
  setHeader(event, 'Content-Type', WEB_BOT_AUTH_MEDIA_TYPE)
  setHeader(event, 'Cache-Control', 'public, max-age=86400')

  try {
    const host = getRequestURL(event).host || 'beatbox.studio'
    const signed = await signWebBotAuthDirectoryResponse(body, host)
    if (signed?.Signature && signed['Signature-Input']) {
      setHeader(event, 'Signature', signed.Signature)
      setHeader(event, 'Signature-Input', signed['Signature-Input'])
    }
  } catch (error) {
    console.error('Web Bot Auth directory signing failed', error)
  }

  return body
})
