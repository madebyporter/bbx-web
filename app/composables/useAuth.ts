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
    console.log('Auth state change:', event, session?.user?.email)
    
    if (session?.user) {
      user.value = session.user as AuthUser
      isAdmin.value = session.user.app_metadata.roles?.includes('admin') || false
      
      // Handle successful email confirmation
      if (event === 'SIGNED_IN') {
        console.log('User signed in successfully:', session.user.email)
      }
    } else if (event === 'SIGNED_OUT') {
      user.value = null
      isAdmin.value = false
    } else if (event === 'TOKEN_REFRESHED') {
      if (session?.user) {
        user.value = session.user as AuthUser
        isAdmin.value = session.user.app_metadata.roles?.includes('admin') || false
      }
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
    if (error) {
      // Handle specific email confirmation error
      if (error.message === 'Email not confirmed') {
        throw new Error('Please check your email and click the confirmation link before signing in.')
      }
      throw error
    }
    return data
  }

  const signUp = async (email: string, password: string, userType: 'creator' | 'audio_pro' = 'creator') => {
    if (!supabase) throw new Error('Supabase not initialized')
    
    // Store userType in localStorage temporarily for confirm.vue to access
    // This avoids passing it in metadata which might cause database trigger issues
    if (typeof window !== 'undefined') {
      localStorage.setItem('pending_user_type', userType)
    }
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`
      }
    })
    if (error) throw error
    
    // Create user_profiles record if user is immediately signed in (email confirmation disabled)
    // If email confirmation is enabled, the profile will be created in confirm.vue
    if (data.user && data.session) {
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            user_type: userType,
            username: email.split('@')[0],
            display_name: email.split('@')[0]
          }, {
            onConflict: 'id'
          })
        
        if (profileError) {
          console.error('Error creating user profile:', profileError)
          // Don't throw - user is created, profile can be fixed later
        } else {
          // Clear localStorage since profile is created
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_user_type')
          }
        }
      } catch (profileErr) {
        console.error('Error creating user profile:', profileErr)
        // Don't throw - user is created, profile can be fixed later
      }
    }
    
    return data
  }

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    if (error) throw error
    return data
  }

  const updatePassword = async (newPassword: string) => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (error) throw error
    return data
  }

  // Handle email confirmation from URL
  const handleEmailConfirmation = async () => {
    if (!supabase) return
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session after email confirmation:', error)
        return
      }
      if (data.session?.user) {
        console.log('Email confirmed successfully for:', data.session.user.email)
        user.value = data.session.user as AuthUser
        isAdmin.value = data.session.user.app_metadata.roles?.includes('admin') || false
      }
    } catch (error) {
      console.error('Error handling email confirmation:', error)
    }
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
    resetPassword,
    updatePassword,
    handleEmailConfirmation,
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