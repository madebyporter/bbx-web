import { createClient } from '@supabase/supabase-js'
import { ref } from 'vue'

// Create a single instance
let supabaseInstance = null

export const useSupabase = () => {
  if (!supabaseInstance) {
    const config = useRuntimeConfig()
    supabaseInstance = createClient(
      config.public.supabaseUrl,
      config.public.supabaseKey,
      {
        auth: {
          persistSession: false // This can help prevent the multiple instances warning
        }
      }
    )
  }

  return { supabase: supabaseInstance }
} 