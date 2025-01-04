import { createClient } from '@supabase/supabase-js'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()
  
  if (!config.public.supabaseUrl || !config.public.supabaseKey) {
    console.error('Supabase configuration missing:', {
      url: !!config.public.supabaseUrl,
      key: !!config.public.supabaseKey
    })
    throw new Error('Supabase configuration missing')
  }

  console.log('Initializing Supabase with URL:', config.public.supabaseUrl)
  
  // Create Supabase client
  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  )

  // Test the connection
  try {
    const { data, error } = await supabase.from('user_resources').select('count').single()
    if (error) throw error
    console.log('Supabase connection successful')
  } catch (error) {
    console.error('Supabase connection error:', error)
  }

  // Provide it to the app
  return {
    provide: {
      supabase
    }
  }
}) 