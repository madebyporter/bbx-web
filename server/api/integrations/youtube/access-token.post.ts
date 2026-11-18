import { requireTrackSyncUser } from '../../../utils/integrationAuth'
import { getValidYouTubeAccessToken } from '../../../utils/youtube'

export default defineEventHandler(async (event) => {
  const { user } = await requireTrackSyncUser(event)
  const accessToken = await getValidYouTubeAccessToken(user.id)
  return { accessToken, expiresIn: 3500 }
})
