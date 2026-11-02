import { useSupabase } from '~/utils/supabase'

export async function useAuthHeaders(): Promise<Record<string, string>> {
  const { supabase } = useSupabase()
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
