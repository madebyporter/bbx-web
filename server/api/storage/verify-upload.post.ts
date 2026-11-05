import { createError, readBody } from 'h3'
import { assertCanUpload, userHasAdminRole } from '../../utils/billing'
import { deleteR2Object, headR2Object } from '../../utils/r2'
import { requireAuthUser } from '../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<{ key?: string; replacingTrackId?: number | null }>(event)
  const key = body.key?.trim()

  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'key is required',
    })
  }

  const prefix = `${user.id}/`
  if (!key.startsWith(prefix)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  let head: { contentLength: number | null; contentType: string | null }
  try {
    head = await headR2Object(key)
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Object not found',
    })
  }

  const size = head.contentLength
  if (size == null || size <= 0) {
    await deleteR2Object(key).catch(() => {})
    throw createError({
      statusCode: 404,
      statusMessage: 'Object not found',
    })
  }

  try {
    await assertCanUpload(user.id, size, {
      replacingTrackId: body.replacingTrackId ?? null,
      isAdmin: userHasAdminRole(user),
    })
  } catch (err) {
    await deleteR2Object(key).catch(() => {})
    throw err
  }

  return { key, size }
})
