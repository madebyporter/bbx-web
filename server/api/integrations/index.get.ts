import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'
import { SOUNDCLOUD_PROVIDER } from '../../utils/soundcloud'
import { YOUTUBE_PROVIDER } from '../../utils/youtube'

function mapIntegration(
  row:
    | {
        provider_username: string | null
        provider_user_id: string | null
        connected_at: string
        expires_at: string | null
      }
    | null
    | undefined,
) {
  if (!row) return { connected: false as const }
  return {
    connected: true as const,
    username: row.provider_username,
    providerUserId: row.provider_user_id,
    connectedAt: row.connected_at,
    expiresAt: row.expires_at,
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('user_integrations')
    .select('provider, provider_username, provider_user_id, connected_at, expires_at')
    .eq('user_id', user.id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load integrations: ${error.message}`,
    })
  }

  const soundcloud = (data || []).find((row) => row.provider === SOUNDCLOUD_PROVIDER)
  const youtube = (data || []).find((row) => row.provider === YOUTUBE_PROVIDER)

  return {
    integrations: {
      soundcloud: mapIntegration(soundcloud),
      youtube: mapIntegration(youtube),
    },
  }
})
