import {
  HTTP_MESSAGE_SIGNATURES_DIRECTORY,
  MediaType,
  directoryResponseHeaders,
  signatureHeaders,
} from 'web-bot-auth'
import { signerFromJWK } from 'web-bot-auth/crypto'
import { SITE_ORIGIN } from './apiCatalog'

/** Public Ed25519 key for Beatbox Web Bot Auth (private material via env only). */
export const WEB_BOT_AUTH_PUBLIC_JWK = {
  kty: 'OKP',
  crv: 'Ed25519',
  kid: '_CWrh8w-k_e4lXU9umZIiB9J8vDojdrv_0cwdzsrSFc',
  x: 'QZbY3bKQamMAK6Yd91-B2ZNP7vWVbHx5UGno30n0mB8',
  use: 'sig',
  alg: 'EdDSA',
} as const

export const WEB_BOT_AUTH_DIRECTORY_PATH = HTTP_MESSAGE_SIGNATURES_DIRECTORY
export const WEB_BOT_AUTH_DIRECTORY_URL = `${SITE_ORIGIN}${WEB_BOT_AUTH_DIRECTORY_PATH}`
export const WEB_BOT_AUTH_MEDIA_TYPE = MediaType.HTTP_MESSAGE_SIGNATURES_DIRECTORY

export function buildWebBotAuthDirectory() {
  return {
    keys: [
      {
        kty: WEB_BOT_AUTH_PUBLIC_JWK.kty,
        crv: WEB_BOT_AUTH_PUBLIC_JWK.crv,
        kid: WEB_BOT_AUTH_PUBLIC_JWK.kid,
        x: WEB_BOT_AUTH_PUBLIC_JWK.x,
        use: WEB_BOT_AUTH_PUBLIC_JWK.use,
        alg: WEB_BOT_AUTH_PUBLIC_JWK.alg,
      },
    ],
  }
}

interface Ed25519PrivateJwk extends JsonWebKey {
  kty: 'OKP'
  crv: 'Ed25519'
  d: string
  x: string
  kid?: string
}

function readPrivateJwk(): Ed25519PrivateJwk | null {
  const raw = process.env.WEB_BOT_AUTH_PRIVATE_JWK?.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Ed25519PrivateJwk>
    if (parsed.kty !== 'OKP' || parsed.crv !== 'Ed25519' || !parsed.d || !parsed.x) {
      console.error('WEB_BOT_AUTH_PRIVATE_JWK is missing required Ed25519 fields')
      return null
    }
    return {
      kty: 'OKP',
      crv: 'Ed25519',
      d: parsed.d,
      x: parsed.x,
      kid: parsed.kid || WEB_BOT_AUTH_PUBLIC_JWK.kid,
      alg: parsed.alg || 'EdDSA',
      use: parsed.use || 'sig',
    }
  } catch (error) {
    console.error('Failed to parse WEB_BOT_AUTH_PRIVATE_JWK', error)
    return null
  }
}

export async function getWebBotAuthSigner() {
  const jwk = readPrivateJwk()
  if (!jwk) return null
  return signerFromJWK(jwk)
}

/** Sign the key-directory HTTP response (tag=http-message-signatures-directory). */
export async function signWebBotAuthDirectoryResponse(body: string, authorityHost = 'beatbox.studio') {
  const signer = await getWebBotAuthSigner()
  if (!signer) return null

  const now = new Date()
  const message = {
    request: new Request(`https://${authorityHost}${WEB_BOT_AUTH_DIRECTORY_PATH}`),
    response: new Response(body, {
      headers: { 'content-type': WEB_BOT_AUTH_MEDIA_TYPE },
    }),
  }

  return directoryResponseHeaders(message, [signer], {
    created: now,
    expires: new Date(now.getTime() + 5 * 60_000),
  })
}

/**
 * Sign an outbound bot/agent request with Signature, Signature-Input, and Signature-Agent.
 * Signature-Agent points at this site's key directory.
 */
export async function signWebBotAuthRequest(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Request> {
  const signer = await getWebBotAuthSigner()
  if (!signer) {
    throw new Error('WEB_BOT_AUTH_PRIVATE_JWK is not configured; cannot sign outbound requests')
  }

  const headers = new Headers(init.headers)
  // RFC structured-field string: quoted URI of the key directory origin or well-known URL
  headers.set('Signature-Agent', `"${WEB_BOT_AUTH_DIRECTORY_URL}"`)

  const request = new Request(input, { ...init, headers })
  const now = new Date()
  const signed = await signatureHeaders(request, signer, {
    created: now,
    expires: new Date(now.getTime() + 5 * 60_000),
  })

  const outHeaders = new Headers(request.headers)
  outHeaders.set('Signature', signed.Signature)
  outHeaders.set('Signature-Input', signed['Signature-Input'])
  outHeaders.set('Signature-Agent', `"${WEB_BOT_AUTH_DIRECTORY_URL}"`)

  return new Request(request, { headers: outHeaders })
}
