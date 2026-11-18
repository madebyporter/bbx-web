import { requireTrackSyncUser } from '../../../utils/integrationAuth'
import { deleteUserIntegration } from '../../../utils/soundcloud'

export default defineEventHandler(async (event) => {
  const { user } = await requireTrackSyncUser(event)
  await deleteUserIntegration(user.id)
  return { ok: true }
})
