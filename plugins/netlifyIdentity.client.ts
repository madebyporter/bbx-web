import { defineNuxtPlugin } from '#app'
import IdentityWidget from 'netlify-identity-widget'

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  
  if (process.client) {
    console.log('Initializing Netlify Identity with URL:', runtimeConfig.public.NETLIFY_IDENTITY_URL)
    
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
      }
    })

    IdentityWidget.on('login', user => {
      if (user) {
        console.log('Login event:', {
          email: user.email,
          metadata: user.app_metadata,
          roles: user.app_metadata?.roles,
          user_metadata: user.user_metadata
        })
      }
    })

    IdentityWidget.on('logout', () => {
      console.log('Logout event - clearing user data')
    })

    IdentityWidget.on('error', err => console.error('Identity error:', err))
  }

  return {
    provide: {
      identity: IdentityWidget
    }
  }
}) 