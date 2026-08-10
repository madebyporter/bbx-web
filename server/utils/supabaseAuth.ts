import { createClient, type User } from '@supabase/supabase-js'
import { createError, getHeader, type H3Event } from 'h3'

function readServerEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ''
}

export function getBearerToken(event: H3Event): string | null {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export async function getAuthUser(event: H3Event): Promise<{ user: User | null; token: string | null }> {
  const token = getBearerToken(event)
  if (!token) return { user: null, token: null }

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseKey

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Supabase is not configured',
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return { user: null, token }
  }

  return { user: data.user, token }
}

export function requireAuthUser(event: H3Event): Promise<User> {
  return getAuthUser(event).then(({ user }) => {
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }
    return user
  })
}

export function getServiceSupabase() {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const serviceKey = readServerEnv('SUPABASE_SERVICE_KEY', 'NUXT_SUPABASE_SERVICE_KEY')

  if (!supabaseUrl || !serviceKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Supabase service role is not configured',
    })
  }

  return createClient(supabaseUrl, serviceKey)
}
