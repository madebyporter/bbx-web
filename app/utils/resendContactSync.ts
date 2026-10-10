import type { SupabaseClient } from '@supabase/supabase-js'

export async function syncResendContact(
  supabase: SupabaseClient | null,
  options?: { source?: 'confirm' }
): Promise<void> {
  if (!supabase) return

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return

    await $fetch('/api/resend/sync-contact', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: options?.source ? { source: options.source } : undefined,
    })
  } catch (error) {
    console.warn('Resend contact sync failed:', error)
  }
}
