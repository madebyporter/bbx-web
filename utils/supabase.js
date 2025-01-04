import { useNuxtApp } from '#app'

export const useSupabase = () => {
  const { $supabase } = useNuxtApp()
  return { supabase: $supabase }
} 