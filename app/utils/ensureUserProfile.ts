import type { SupabaseClient } from '@supabase/supabase-js'
import { PENDING_USER_TYPE_KEY } from '~/utils/authStorage'

function sanitizeUsername(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'user'
}

/**
 * Ensure a user_profiles row exists for the auth user.
 * Returns the username (may be newly created).
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
  preferredType?: 'creator' | 'audio_pro',
): Promise<{ id: string; username: string; user_type: 'creator' | 'audio_pro' } | null> {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id, username, user_type')
    .eq('id', user.id)
    .maybeSingle()

  if (existing?.id) {
    const username =
      typeof existing.username === 'string' && existing.username
        ? existing.username
        : sanitizeUsername(user.email?.split('@')[0] || 'user')

    if (!existing.username) {
      await supabase
        .from('user_profiles')
        .update({ username, display_name: username })
        .eq('id', user.id)
    }

    return {
      id: existing.id as string,
      username,
      user_type: (existing.user_type as 'creator' | 'audio_pro') || 'creator',
    }
  }

  const pendingType =
    preferredType ||
    (typeof window !== 'undefined'
      ? (localStorage.getItem(PENDING_USER_TYPE_KEY) as 'creator' | 'audio_pro' | null)
      : null) ||
    'creator'

  let username = sanitizeUsername(user.email?.split('@')[0] || 'user')

  // Avoid collisions by appending a short suffix when needed
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? username : `${username}-${Math.random().toString(36).slice(2, 6)}`
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          user_type: pendingType,
          username: candidate,
          display_name: candidate,
        },
        { onConflict: 'id' },
      )
      .select('id, username, user_type')
      .single()

    if (!error && data) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PENDING_USER_TYPE_KEY)
      }
      return {
        id: data.id as string,
        username: (data.username as string) || candidate,
        user_type: (data.user_type as 'creator' | 'audio_pro') || pendingType,
      }
    }

    // Unique violation — try another username
    if (error?.code === '23505') continue
    console.error('ensureUserProfile failed:', error)
    break
  }

  return null
}
