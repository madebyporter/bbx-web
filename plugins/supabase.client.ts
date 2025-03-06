import { createClient } from '@supabase/supabase-js'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import type { NetlifyIdentityUser } from '~/types/netlify-identity'

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

  // Custom fetch function that adds the Netlify Identity token
  const customFetch = async (input: RequestInfo | URL, options: RequestInit = {}) => {
    const currentUser = window?.netlifyIdentity?.currentUser() as NetlifyIdentityUser | null
    const token = currentUser?.token?.access_token

    // Debug logging
    console.log('Supabase request details:', {
      hasUser: !!currentUser,
      hasToken: !!token,
      userId: currentUser?.id,
      url: typeof input === 'string' ? input : input.toString(),
      method: options.method || 'GET'
    })

    // Debug JWT token
    if (token) {
      try {
        const tokenParts = token.split('.')
        const tokenPayload = JSON.parse(atob(tokenParts[1]))
        console.log('JWT token details:', {
          payload: tokenPayload,
          sub: tokenPayload.sub,
          role: tokenPayload.role,
          exp: new Date(tokenPayload.exp * 1000).toISOString(),
          iss: tokenPayload.iss,
          aud: tokenPayload.aud
        })
      } catch (error) {
        console.error('Error parsing JWT token:', error)
      }
    }

    // Merge headers with required Supabase headers
    const headers = new Headers(options.headers || {})
    
    // Always include the Supabase API key
    headers.set('apikey', config.public.supabaseKey)
    
    // Add authorization header if we have a token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Log headers for debugging (excluding sensitive values)
    console.log('Request headers:', {
      hasApiKey: !!headers.get('apikey'),
      hasAuth: !!headers.get('Authorization'),
      url: typeof input === 'string' ? input : input.toString(),
      method: options.method || 'GET'
    })

    return fetch(input, { ...options, headers })
  }

  try {
    supabaseInstance = createClient(
      config.public.supabaseUrl,
      config.public.supabaseKey,
      {
        auth: {
          persistSession: false
        },
        global: {
          fetch: customFetch
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