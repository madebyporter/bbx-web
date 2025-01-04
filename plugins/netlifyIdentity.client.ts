import { defineNuxtPlugin } from '#app'
import IdentityWidget from 'netlify-identity-widget'
import { useAuth } from '~/composables/useAuth'

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  
  if (process.client) {
    console.log('Initializing Netlify Identity with URL:', runtimeConfig.public.NETLIFY_IDENTITY_URL)
    
    // Initialize auth composable
    const auth = useAuth()
    
    IdentityWidget.init({
      APIUrl: runtimeConfig.public.NETLIFY_IDENTITY_URL
    })

    // Force refresh the user data on init
    const currentUser = IdentityWidget.currentUser()
    if (currentUser) {
      console.log('Current user found:', {
        email: currentUser.email,
        metadata: currentUser.app_metadata,
        roles: currentUser.app_metadata?.roles,
        user_metadata: currentUser.user_metadata
      })
      // Initialize auth state with current user
      auth.init()
    }

    // Enhanced event logging
    IdentityWidget.on('init', user => {
      if (user) {
        console.log('Init event:', {
          email: user.email,
          metadata: user.app_metadata,
          roles: user.app_metadata?.roles,
          user_metadata: user.user_metadata
        })
        // Initialize auth state on init event
        auth.init()
      }
    })

    IdentityWidget.on('login', user => {
      if (user) {
        console.log('Login event:', {
          email: user.email,
          metadata: user.app_metadata,
          roles: user.app_metadata?.roles
        })
        // Initialize auth state on login
        auth.init()
      }
    })

    IdentityWidget.on('logout', () => {
      console.log('Logout event - clearing user data')
      // Clear auth state on logout
      auth.init()
    })

    IdentityWidget.on('error', err => console.error('Identity error:', err))
  }

  return {
    provide: {
      identity: IdentityWidget
    }
  }
}) 