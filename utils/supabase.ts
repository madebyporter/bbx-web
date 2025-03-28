import { createClient } from '@supabase/supabase-js'
import { useRuntimeConfig } from '#app'

let supabaseInstance: ReturnType<typeof createClient> | null = null

export const useSupabase = () => {
  const config = useRuntimeConfig()
  
  if (!config.public.supabaseUrl || !config.public.supabaseKey) {
    console.error('Supabase configuration missing')
    return { supabase: null }
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(
        config.public.supabaseUrl,
        config.public.supabaseKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      )
    } catch (error) {
      console.error('Failed to initialize Supabase:', error)
      return { supabase: null }
    }
  }

  return { supabase: supabaseInstance }
} 