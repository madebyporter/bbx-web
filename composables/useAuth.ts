import type { User } from 'netlify-identity-widget'
import { ref, computed } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'

export const useAuth = () => {
  const { $netlifyIdentity, $supabase } = useNuxtApp()
  const user = ref<User | null>(null)
  const isAdmin = computed(() => user.value?.app_metadata?.roles?.includes('admin'))
  const supabase = $supabase as SupabaseClient

  const init = async () => {
    $netlifyIdentity.on('init', (initUser: User | null) => {
      user.value = initUser
      if (initUser) {
        syncUserWithSupabase(initUser)
      }
    })

    $netlifyIdentity.on('login', (loginUser: User) => {
      user.value = loginUser
      syncUserWithSupabase(loginUser)
    })

    $netlifyIdentity.on('logout', () => {
      user.value = null
    })
  }

  const syncUserWithSupabase = async (netlifyUser: User) => {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: netlifyUser.id,
        email: netlifyUser.email,
        user_metadata: netlifyUser.user_metadata,
        app_metadata: netlifyUser.app_metadata,
        created_at: netlifyUser.created_at,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error syncing user with Supabase:', error)
    }
  }

  const login = () => {
    $netlifyIdentity.open('login')
  }

  const logout = () => {
    $netlifyIdentity.logout()
  }

  const markResourceAsUsed = async (resourceId: number) => {
    if (!user.value) return

    const { error } = await supabase
      .from('user_resources')
      .upsert({
        user_id: user.value.id,
        resource_id: resourceId,
        used_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error marking resource as used:', error)
      throw error
    }
  }

  const submitResource = async (resourceData: {
    name: string
    creator: string
    tags: string[]
    price: string
    os: string[]
    link: string
    image_url?: string
    type: string
  }) => {
    if (!user.value) return

    const { error } = await supabase
      .from('resources')
      .insert({
        ...resourceData,
        submitted_by: user.value.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error submitting resource:', error)
      throw error
    }
  }

  return {
    user,
    isAdmin,
    init,
    login,
    logout,
    markResourceAsUsed,
    submitResource,
  }
} 