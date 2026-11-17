import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { createError } from 'h3'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const secret =
    process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim() ||
    process.env.SOUNDCLOUD_CLIENT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    ''

  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Integrations encryption key is not configured',
    })
  }

  return createHash('sha256').update(secret).digest()
}

/** Encrypt a string → `iv:tag:ciphertext` (all base64url). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(
    ':',
  )
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(':')
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw createError({ statusCode: 500, statusMessage: 'Invalid encrypted secret format' })
  }
  const iv = Buffer.from(parts[0], 'base64url')
  const tag = Buffer.from(parts[1], 'base64url')
  const data = Buffer.from(parts[2], 'base64url')
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
