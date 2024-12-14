import { useSupabase } from './supabase'

export const handleNetlifyUser = async (user: any) => {
  if (!user) return null

  const { supabase } = useSupabase()
  
  try {
    // First ensure user exists in users table
    const { error: userError } = await supabase
      .from('users')
      .upsert([{
        id: user.id,
        email: user.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], { onConflict: 'id' })

    if (userError) throw userError

    // Then check if profile exists
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