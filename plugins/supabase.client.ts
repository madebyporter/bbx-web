import { createClient } from '@supabase/supabase-js'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import type { NetlifyIdentityUser } from '~/types/netlify-identity'

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

    // Merge headers
    const headers = new Headers(options.headers || {})
    headers.set('apikey', config.public.supabaseKey)
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
      // Log full headers for debugging
      console.log('Request headers:', {
        authorization: `Bearer ${token.substring(0, 20)}...`,
        apikey: config.public.supabaseKey.substring(0, 20) + '...',
        url: typeof input === 'string' ? input : input.toString(),
        method: options.method || 'GET'
      })
    } else {
      console.warn('No Netlify Identity token available for Supabase request')
    }

    // Return modified fetch with error handling
    try {
      const response = await fetch(input, {
        ...options,
        headers
      })
      
      if (!response.ok) {
        console.error('Supabase request failed:', {
          status: response.status,
          statusText: response.statusText,
          url: typeof input === 'string' ? input : input.toString(),
          userId: currentUser?.id
        })
      }
      
      return response
    } catch (error) {
      console.error('Supabase request error:', error)
      throw error
    }
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