import { requireTrackSyncUser } from '../../../utils/integrationAuth'
import { deleteYouTubeIntegration } from '../../../utils/youtube'

export default defineEventHandler(async (event) => {
  const { user } = await requireTrackSyncUser(event)
  await deleteYouTubeIntegration(user.id)
  return { ok: true }
})
