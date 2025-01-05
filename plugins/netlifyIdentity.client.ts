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
      auth.updateUserState(currentUser)
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
        auth.updateUserState(user)
      }
    })

    IdentityWidget.on('login', async user => {
      if (user) {
        console.log('Login event:', {
          email: user.email,
          metadata: user.app_metadata,
          roles: user.app_metadata?.roles
        })
        
        try {
          // Close the modal first
          IdentityWidget.close()
          
          // Update state immediately with the user we have
          auth.updateUserState(user)
          
          // Wait for Netlify Identity to fully initialize
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Get fresh user data and sync with Supabase
          const currentUser = IdentityWidget.currentUser()
          if (currentUser) {
            await auth.syncUserWithSupabase(currentUser)
          } else {
            console.error('Failed to get current user after login')
          }
        } catch (error) {
          console.error('Error during login:', error)
        }
      }
    })

    IdentityWidget.on('logout', () => {
      console.log('Logout event')
      auth.updateUserState(null)
    })

    IdentityWidget.on('error', err => {
      console.error('Netlify Identity error:', err)
    })

    // Provide the identity widget to the app
    return {
      provide: {
        identity: IdentityWidget
      }
    }
  }
}) 