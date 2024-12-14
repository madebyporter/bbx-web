import { useSupabase } from './supabase'

export const handleNetlifyUser = async (user: any) => {
  if (!user) return null

  const { supabase } = useSupabase()
  
  try {
    // First check if user exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    // If user doesn't exist, create them with metadata
    if (!existingUser) {
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (userError) throw userError
    }

    // Then check if user profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return existingProfile
    }

    // If no profile exists, create one
    const { data: newProfile, error } = await supabase
      .from('user_profiles')
      .insert([{
        id: user.id,
        username: user.user_metadata?.full_name || user.email.split('@')[0],
        display_name: user.user_metadata?.full_name || user.email.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        user_type: 'other',
        social_links: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      throw error
    }
    
    return newProfile

  } catch (error) {
    console.error('Error syncing Netlify user to Supabase:', error)
    return null
  }
} 