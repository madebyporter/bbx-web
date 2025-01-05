import { createClient } from '@supabase/supabase-js'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

declare global {
  interface Window {
    netlifyIdentity: {
      currentUser: () => {
        token?: {
          access_token?: string;
        };
      } | null;
    };
  }
}

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

  // Custom fetch function that adds the Netlify Identity token
  const customFetch = async (input: RequestInfo | URL, options: RequestInit = {}) => {
    const currentUser = window?.netlifyIdentity?.currentUser()
    const token = currentUser?.token?.access_token

    // Merge headers
    const headers = new Headers(options.headers || {})
    headers.set('apikey', config.public.supabaseKey)
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Return modified fetch
    return fetch(input, {
      ...options,
      headers
    })
  }
  
  // Create Supabase client
  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        fetch: customFetch
      }
    }
  )

  // Test the connection
  try {
    const { data, error } = await supabase
      .from('user_resources')
      .select('count')
      .limit(1)
      .single()
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