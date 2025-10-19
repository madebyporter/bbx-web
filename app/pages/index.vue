<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <!-- Temporary redirect page - replace with real landing page in future -->
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import { navigateTo } from '#app'

// TEMPORARY HOMEPAGE REDIRECT
// TODO: Replace this with a real landing page in the future
// When ready, remove the redirect logic below and add proper homepage content

const { user, isReady, init } = useAuth()
const { supabase } = useSupabase()
const username = ref<string | null>(null)

// Fetch username for the logged-in user
const fetchUsername = async () => {
  if (!user.value || !supabase) {
    username.value = null
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (data && !error) {
      username.value = data.username as string
    } else if (error) {
      console.error('Error fetching username:', error)
      username.value = null
    }
  } catch (error) {
    console.error('Error fetching username:', error)
    username.value = null
  }
}

onMounted(async () => {
  await init()
  await fetchUsername()
})

// Watch for auth ready state and redirect
watch(isReady, (ready) => {
  if (ready) {
    if (user.value) {
      // Logged in → fetch username first, then redirect
      fetchUsername().then(() => {
        if (username.value) {
          navigateTo(`/u/${username.value}`, { replace: true })
        } else {
          // Fallback to UUID if username not found
          navigateTo(`/u/${user.value.id}`, { replace: true })
        }
      })
    } else {
      // Logged out → go to software page (temporary homepage)
      navigateTo('/software', { replace: true })
    }
  }
}, { immediate: true })
</script> 