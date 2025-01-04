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

  const syncUserWithSupabase = async (netlifyUser: NetlifyUser) => {
    if (!initSupabase()) return

    try {
      const { error } = await $supabase
        .from('users')
        .upsert({
          id: netlifyUser.id,
          email: netlifyUser.email,
          user_metadata: netlifyUser.user_metadata,
          app_metadata: netlifyUser.app_metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Error syncing user with Supabase:', error)
      }
    } catch (error) {
      console.error('Failed to sync user with Supabase:', error)
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
      globalUser.value = {
        id: currentUser.id,
        email: currentUser.email,
        user_metadata: currentUser.user_metadata || {},
        app_metadata: currentUser.app_metadata || {},
        created_at: new Date().toISOString()
      }
      console.log('Setting user state to:', globalUser.value)
      try {
        await syncUserWithSupabase(globalUser.value)
      } catch (error) {
        console.error('Failed to sync initial user state:', error)
      }
    } else {
      console.log('No current user, setting user state to null')
      globalUser.value = null
    }
  }

  const markResourceAsUsed = async (resourceId: number) => {
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
      const { data: existingRecord, error: checkError } = await $supabase
        .from('user_resources')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('user_id', globalUser.value.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingRecord) {
        console.log('Resource already marked as used, removing...')
        // If it exists, delete it (unmark)
        const { error } = await $supabase
          .from('user_resources')
          .delete()
          .eq('resource_id', resourceId)
          .eq('user_id', globalUser.value.id)

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

  const login = () => {
    $identity?.open()
  }

  const logout = () => {
    $identity?.logout()
  }

  return {
    user: globalUser,
    isAdmin: globalIsAdmin,
    init,
    login,
    logout,
    markResourceAsUsed
  }
} 