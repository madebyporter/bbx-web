import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function readServerEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ''
}

/** Read-only Supabase client for public markdown data. */
export function getMarkdownSupabase(): SupabaseClient | null {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key =
    readServerEnv('SUPABASE_SERVICE_KEY', 'NUXT_SUPABASE_SERVICE_KEY')
    || config.public.supabaseKey

  if (!url || !key) return null
  return createClient(url, key)
}
