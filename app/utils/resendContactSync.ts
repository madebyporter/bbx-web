import type { SupabaseClient } from '@supabase/supabase-js'

export async function syncResendContact(supabase: SupabaseClient | null): Promise<void> {
  if (!supabase) return

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return

    await $fetch('/api/resend/sync-contact', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (error) {
    console.warn('Resend contact sync failed:', error)
  }
}
