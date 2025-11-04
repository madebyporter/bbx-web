<template>
  <div class="min-h-screen bg-neutral-900 flex items-center justify-center">
    <div class="bg-neutral-800 p-8 rounded-lg max-w-md w-full mx-4">
      <div v-if="isLoading" class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Verifying reset link...</h2>
        <p class="text-neutral-400">Please wait while we verify your password reset link.</p>
      </div>
      
      <div v-else-if="isSuccess" class="text-center">
        <div class="text-green-500 text-4xl mb-4">✓</div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Password Updated!</h2>
        <p class="text-neutral-400 mb-4">Your password has been successfully updated. You can now sign in with your new password.</p>
        <button 
          @click="goToSignIn"
          class="bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-600 transition-colors"
        >
          Sign In
        </button>
      </div>
      
      <div v-else-if="isError" class="text-center">
        <div class="text-red-500 text-4xl mb-4">✗</div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Reset Failed</h2>
        <p class="text-neutral-400 mb-4">{{ errorMessage }}</p>
        <button 
          @click="goToSignIn"
          class="bg-neutral-600 text-neutral-200 px-4 py-2 rounded hover:bg-neutral-500 transition-colors"
        >
          Back to Sign In
        </button>
      </div>

      <div v-else class="space-y-4">
        <h2 class="text-xl font-bold text-neutral-200 mb-4">Set New Password</h2>
        <form @submit.prevent="handlePasswordReset" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1 text-neutral-200">New Password</label>
            <input 
              v-model="newPassword" 
              type="password" 
              required
              minlength="6"
              class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500 text-neutral-200" 
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 text-neutral-200">Confirm Password</label>
            <input 
              v-model="confirmPassword" 
              type="password" 
              required
              minlength="6"
              class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500 text-neutral-200" 
              placeholder="Confirm new password"
            />
          </div>
          <div v-if="passwordError" class="text-red-400 text-sm">
            {{ passwordError }}
          </div>
          <div class="flex justify-between items-center">
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Updating...' : 'Update Password' }}
            </button>
            <button 
              type="button"
              @click="goToSignIn"
              class="text-sm text-neutral-400 hover:text-neutral-300"
            >
              Cancel
            </button>
          </div>
        </form>
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
const isSubmitting = ref(false)
const errorMessage = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const isValidToken = ref(false)

onMounted(async () => {
  try {
    // Check if we're coming from a password reset email
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const type = urlParams.get('type')
    
    if (!token || type !== 'recovery') {
      // Check if there's already an active recovery session
      const { data: { session } } = await supabase?.auth.getSession()
      
      if (!session) {
        throw new Error('Invalid or expired reset link. Please request a new password reset.')
      }
      
      // Valid session, show password reset form
      isValidToken.value = true
      isLoading.value = false
    } else {
      // Verify the recovery token
      const { data, error } = await supabase?.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      })
      
      if (error) {
        throw error
      }
      
      if (data.session) {
        isValidToken.value = true
        console.log('Recovery token verified successfully')
      } else {
        throw new Error('Invalid or expired reset link')
      }
      
      isLoading.value = false
    }
  } catch (error: any) {
    console.error('Password reset verification error:', error)
    isError.value = true
    isLoading.value = false
    errorMessage.value = error.message || 'An error occurred while verifying your reset link. Please try requesting a new password reset.'
  }
})

const handlePasswordReset = async () => {
  passwordError.value = ''
  
  // Validate passwords match
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match'
    return
  }
  
  // Validate password length
  if (newPassword.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters long'
    return
  }
  
  isSubmitting.value = true
  
  try {
    await auth.updatePassword(newPassword.value)
    isSuccess.value = true
    console.log('Password updated successfully')
  } catch (error: any) {
    console.error('Password update error:', error)
    passwordError.value = error.message || 'Failed to update password. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

const goToSignIn = () => {
  // Clear URL parameters and redirect to home
  window.history.replaceState({}, document.title, '/')
  navigateTo('/')
}
</script>
