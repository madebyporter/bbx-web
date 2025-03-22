import { ref, computed } from 'vue'
import { useSupabase } from '~/utils/supabase'
import type { Subscription } from '@supabase/supabase-js'
import type { AuthUser } from '~/types/auth'

// Create a singleton instance
let instance: ReturnType<typeof createAuth> | null = null

const createAuth = () => {
  const { supabase } = useSupabase()
  const user = ref<AuthUser | null>(null)
  const isAdmin = ref(false)
  const isReady = ref(false)
  let subscription: Subscription | null = null

  // Computed property for user state
  const currentUser = computed(() => {
    return user.value
  })

  // Initialize auth state
  const init = async () => {
    if (!supabase) {
      console.error('Supabase not initialized')
      return
    }

    if (isReady.value) {
      return
    }

    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        user.value = session.user as AuthUser
        isAdmin.value = session.user.app_metadata.roles?.includes('admin') || false
      }

      // Set up auth state change listener
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, session) => {
        
        if (session?.user) {
          user.value = session.user as AuthUser
          isAdmin.value = session.user.app_metadata.roles?.includes('admin') || false
        } else if (event === 'SIGNED_OUT') {
          user.value = null
          isAdmin.value = false
        }
      })
      subscription = sub
      isReady.value = true
    } catch (error) {
      console.error('Auth initialization error:', error)
    }
  }

  // Auth methods
  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Cleanup
  const cleanup = () => {
    if (subscription) {
      subscription.unsubscribe()
      subscription = null
    }
  }

  return {
    user: currentUser,
    isAdmin,
    isReady,
    init,
    signIn,
    signUp,
    signOut,
    cleanup
  }
}

// Export a singleton instance
export const useAuth = () => {
  if (!instance) {
    instance = createAuth()
  }
  return instance
} 