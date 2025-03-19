import { createClient } from '@supabase/supabase-js'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

let supabaseInstance: ReturnType<typeof createClient> | null = null

export default defineNuxtPlugin(async (nuxtApp) => {
  // If we already have an instance, return it
  if (supabaseInstance) {
    return {
      provide: {
        supabase: supabaseInstance
      }
    }
  }

  const config = useRuntimeConfig()
  
  // Add retry logic for config
  let retries = 0
  const maxRetries = 5
  
  while (!config.public.supabaseUrl || !config.public.supabaseKey) {
    if (retries >= maxRetries) {
      console.error('Failed to initialize Supabase after', maxRetries, 'retries')
      throw new Error('Supabase configuration missing')
    }
    
    console.log('Waiting for Supabase configuration...', {
      url: !!config.public.supabaseUrl,
      key: !!config.public.supabaseKey,
      retry: retries + 1
    })
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    retries++
  }

  console.log('Initializing Supabase with URL:', config.public.supabaseUrl)

  try {
    supabaseInstance = createClient(
      config.public.supabaseUrl,
      config.public.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'supabase.auth.token',
          storage: {
            getItem: (key) => {
              if (typeof window === 'undefined') return null
              return localStorage.getItem(key)
            },
            setItem: (key, value) => {
              if (typeof window === 'undefined') return
              localStorage.setItem(key, value)
            },
            removeItem: (key) => {
              if (typeof window === 'undefined') return
              localStorage.removeItem(key)
            }
          }
        }
      }
    )

    // Test the connection
    const { data, error } = await supabaseInstance.from('resources').select('count').limit(1)
    if (error) throw error
    console.log('Supabase connection successful')

    return {
      provide: {
        supabase: supabaseInstance
      }
    }
  } catch (error) {
    console.error('Failed to initialize Supabase:', error)
    // Clear the instance if initialization failed
    supabaseInstance = null
    throw error
  }
}) 