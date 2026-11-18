import { createError } from 'h3'
import type { H3Event } from 'h3'
import { getEntitlements, hasEntitlement, userHasAdminRole } from './billing'
import { requireAuthUser } from './supabaseAuth'

export async function requireTrackSyncUser(event: H3Event) {
  const user = await requireAuthUser(event)
  const entitlements = await getEntitlements(user.id, {
    isAdmin: userHasAdminRole(user),
  })

  if (!hasEntitlement(entitlements, 'track_sync') && !userHasAdminRole(user)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Track sync requires a Pro plan',
      data: { code: 'track_sync_required' },
    })
  }

  return { user, entitlements }
}
