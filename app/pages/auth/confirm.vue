<template>
  <div class="min-h-screen bg-neutral-900 flex items-center justify-center">
    <div class="bg-neutral-800 p-8 rounded-lg max-w-md w-full mx-4">
      <div v-if="isLoading" class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Confirming your email...</h2>
        <p class="text-neutral-400">Please wait while we confirm your email address.</p>
      </div>
      
      <div v-else-if="isSuccess" class="text-center">
        <div class="text-green-500 text-4xl mb-4">✓</div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Email Confirmed!</h2>
        <p class="text-neutral-400 mb-4">Your email has been successfully confirmed. You can now sign in to your account.</p>
        <button 
          @click="goToSignIn"
          class="bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-600 transition-colors"
        >
          Sign In
        </button>
      </div>
      
      <div v-else-if="isError" class="text-center">
        <div class="text-red-500 text-4xl mb-4">✗</div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Confirmation Failed</h2>
        <p class="text-neutral-400 mb-4">{{ errorMessage }}</p>
        <button 
          @click="goToSignIn"
          class="bg-neutral-600 text-neutral-200 px-4 py-2 rounded hover:bg-neutral-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'

const auth = useAuth()
const { supabase } = useSupabase()

const isLoading = ref(true)
const isSuccess = ref(false)
const isError = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  try {
    // Check if we're coming from an email confirmation
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const type = urlParams.get('type')
    
    if (token && type === 'signup') {
      // Handle the email confirmation
      const { data, error } = await supabase?.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      })
      
      if (error) {
        throw error
      }
      
      if (data.session?.user) {
        isSuccess.value = true
        console.log('Email confirmed successfully:', data.session.user.email)
      }
    } else {
      // Check if user is already confirmed and signed in
      await auth.handleEmailConfirmation()
      const { data: { session } } = await supabase?.auth.getSession()
      
      if (session?.user) {
        isSuccess.value = true
      } else {
        throw new Error('No valid confirmation token found')
      }
    }
  } catch (error: any) {
    console.error('Email confirmation error:', error)
    isError.value = true
    errorMessage.value = error.message || 'An error occurred while confirming your email'
  } finally {
    isLoading.value = false
  }
})

const goToSignIn = () => {
  // Clear URL parameters and redirect to home
  window.history.replaceState({}, document.title, '/')
  navigateTo('/')
}
</script>
