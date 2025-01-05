import { defineNuxtPlugin } from '#app'
import IdentityWidget from 'netlify-identity-widget'
import { useAuth } from '~/composables/useAuth'
import type { NetlifyIdentityUser } from '~/types/netlify-identity'

// Helper function to ensure user data matches our type
const normalizeUser = (user: any): NetlifyIdentityUser => ({
  id: user.id,
  email: user.email,
  token: user.token,
  user_metadata: user.user_metadata || {},
  app_metadata: user.app_metadata || {},
  created_at: user.created_at || new Date().toISOString()
})

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
    const rawUser = IdentityWidget.currentUser()
    if (rawUser) {
      const currentUser = normalizeUser(rawUser)
      console.log('Current user found:', {
        email: currentUser.email,
        metadata: currentUser.app_metadata,
        roles: currentUser.app_metadata?.roles,
        user_metadata: currentUser.user_metadata
      })
      // Initialize auth state with current user
      auth.updateUserState(currentUser)
      // Sync with Supabase
      auth.syncUserWithSupabase(currentUser).catch(error => {
        console.error('Failed to sync user with Supabase on init:', error)
      })
    }

    // Enhanced event logging
    IdentityWidget.on('init', rawUser => {
      if (rawUser) {
        const user = normalizeUser(rawUser)
        console.log('Init event:', {
          email: user.email,
          metadata: user.app_metadata,
          roles: user.app_metadata?.roles,
          user_metadata: user.user_metadata
        })
        // Initialize auth state on init event
        auth.updateUserState(user)
        // Sync with Supabase
        auth.syncUserWithSupabase(user).catch(error => {
          console.error('Failed to sync user with Supabase on init event:', error)
        })
      }
    })

    IdentityWidget.on('login', async rawUser => {
      if (rawUser) {
        const user = normalizeUser(rawUser)
        console.log('Login event:', {
          email: user.email,
          metadata: user.app_metadata,
          roles: user.app_metadata?.roles
        })
        
        try {
          // Close the modal first
          IdentityWidget.close()
          
          // Wait for Netlify Identity to fully initialize
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Get fresh user data
          const currentRawUser = IdentityWidget.currentUser()
          if (!currentRawUser) {
            console.error('No current user available after login')
            return
          }

          const currentUser = normalizeUser(currentRawUser)

          // Verify we have a token
          if (!currentUser.token?.access_token) {
            console.error('No access token available after login')
            return
          }

          console.log('Successfully got user and token after login')
          
          // Update state and sync with Supabase
          auth.updateUserState(currentUser)
          await auth.syncUserWithSupabase(currentUser)
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