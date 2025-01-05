import type { SupabaseClient } from '@supabase/supabase-js'
import { ref, computed } from 'vue'
import { useNuxtApp } from '#app'

// Define our own User type since the Netlify one isn't exported
interface NetlifyUser {
  id: string
  email: string
  user_metadata: {
    avatar_url?: string
    full_name?: string
    [key: string]: any
  }
  app_metadata: {
    roles?: string[]
    [key: string]: any
  }
  created_at?: string
}

// Create a global state
const globalUser = ref<NetlifyUser | null>(null)
const globalIsAdmin = computed(() => globalUser.value?.app_metadata?.roles?.includes('admin'))

export const useAuth = () => {
  const { $identity, $supabase } = useNuxtApp()

  // Initialize Supabase
  const initSupabase = () => {
    if (!$supabase) {
      console.error('Supabase client not available')
      return false
    }
    return true
  }

  const updateUserState = (user: any | null) => {
    if (user) {
      globalUser.value = {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata || {},
        app_metadata: user.app_metadata || {},
        created_at: user.created_at || new Date().toISOString()
      }
      console.log('Updated user state to:', globalUser.value)
    } else {
      globalUser.value = null
      console.log('Cleared user state')
    }
  }

  const syncUserWithSupabase = async (netlifyUser: NetlifyUser) => {
    if (!initSupabase()) return

    try {
      console.log('Attempting to sync user:', {
        id: netlifyUser.id,
        email: netlifyUser.email
      })

      // First sync the users table
      const userData = {
        id: netlifyUser.id,
        email: netlifyUser.email,
        user_metadata: netlifyUser.user_metadata,
        app_metadata: netlifyUser.app_metadata,
        updated_at: new Date().toISOString(),
        created_at: netlifyUser.created_at || new Date().toISOString()
      }

      const { error: userError } = await $supabase
        .from('users')
        .upsert(userData)

      if (userError) {
        console.error('Error syncing user with Supabase:', userError)
        throw userError
      }

      // Then ensure user profile exists
      const profileData = {
        id: netlifyUser.id,
        username: netlifyUser.email?.split('@')[0] || `user_${netlifyUser.id}`,
        display_name: netlifyUser.user_metadata?.full_name || netlifyUser.email?.split('@')[0] || `User ${netlifyUser.id}`,
        avatar_url: netlifyUser.user_metadata?.avatar_url || '',
        created_at: netlifyUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Attempting to create/update profile:', profileData)

      const { error: profileError } = await $supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'id'
        })

      if (profileError) {
        console.error('Error syncing user profile with Supabase:', profileError)
        if (profileError.code === '42501') {
          console.error('Permission denied. Please ensure RLS policies are properly configured for user_profiles table.')
          console.error('Required policies:')
          console.error('1. Allow users to insert their own profile')
          console.error('2. Allow users to update their own profile')
          console.error('3. Allow users to read any profile')
        }
        throw profileError
      }
    } catch (error) {
      console.error('Failed to sync user with Supabase:', error)
      throw error
    }
  }

  const init = async () => {
    console.log('Initializing auth state...')
    
    // Initialize Supabase first
    if (!initSupabase()) {
      console.error('Failed to initialize Supabase')
      return
    }

    // Initialize user state
    const currentUser = $identity?.currentUser()
    console.log('Current Netlify user:', currentUser)
    
    if (currentUser) {
      updateUserState(currentUser)
      try {
        await syncUserWithSupabase(currentUser)
      } catch (error) {
        console.error('Failed to sync initial user state:', error)
      }
    } else {
      updateUserState(null)
    }
  }

  return {
    user: globalUser,
    isAdmin: globalIsAdmin,
    init,
    updateUserState,
    syncUserWithSupabase,
    markResourceAsUsed: async (resourceId: number) => {
      if (!globalUser.value || !initSupabase()) {
        console.error('User not logged in or Supabase not initialized')
        return false
      }

      try {
        console.log('Checking if resource is already used by user:', {
          resourceId,
          userId: globalUser.value.id
        })
        
        // First check if the user already has this resource marked as used
        const { data: existingRecords, error: checkError } = await $supabase
          .from('user_resources')
          .select('id')
          .match({
            resource_id: resourceId,
            user_id: globalUser.value.id
          })

        if (checkError) throw checkError

        const existingRecord = existingRecords?.[0]

        if (existingRecord) {
          console.log('Resource already marked as used, removing...')
          // If it exists, delete it (unmark)
          const { error } = await $supabase
            .from('user_resources')
            .delete()
            .match({
              resource_id: resourceId,
              user_id: globalUser.value.id
            })

          if (error) throw error
          console.log('Successfully removed resource usage')
          return false
        } else {
          console.log('Resource not marked as used, adding...')
          // If it doesn't exist, create it (mark as used)
          const { error } = await $supabase
            .from('user_resources')
            .insert([{
              user_id: globalUser.value.id,
              resource_id: resourceId,
              used_at: new Date().toISOString(),
            }])

          if (error) throw error
          console.log('Successfully added resource usage')
          return true
        }
      } catch (error) {
        console.error('Error marking resource as used:', error)
        throw error
      }
    }
  }
} 