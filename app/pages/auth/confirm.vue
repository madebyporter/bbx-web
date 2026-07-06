<template>
  <div class="grow bg-neutral-900 flex items-center justify-center">
    <div class="bg-neutral-800 p-8 rounded-lg max-w-md w-full mx-4">
      <div v-if="isLoading" class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Confirming your email...</h2>
        <p class="text-neutral-400">Please wait while we confirm your email address.</p>
      </div>
      
      <div v-else-if="isSuccess" class="text-center">
        <div class="text-green-500 text-4xl mb-4">✓</div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Email Confirmed!</h2>
        <p class="text-neutral-400 mb-4">
          <template v-if="isSignedIn">
            You're all set. Welcome to Beatbox Studio.
          </template>
          <template v-else>
            Your email has been successfully confirmed. You can now sign in to your account.
          </template>
        </p>
        <Button @click="finishConfirmation">
          {{ isSignedIn ? 'Continue to Beatbox' : 'Sign In' }}
        </Button>
      </div>
      
      <div v-else-if="isError" class="text-center">
        <div class="text-red-500 text-4xl mb-4">✗</div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Confirmation Failed</h2>
        <p class="text-neutral-400 mb-4">{{ errorMessage }}</p>
        <Button variant="secondary" @click="finishConfirmation">
          Try Again
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useAnalytics } from '~/composables/useAnalytics'
import { useSupabase } from '~/utils/supabase'
import { PENDING_USER_TYPE_KEY, clearPendingSignupEmail } from '~/utils/authStorage'
import { syncResendContact } from '~/utils/resendContactSync'

const auth = useAuth()
const { supabase } = useSupabase()
const { capture } = useAnalytics()

const isLoading = ref(true)
const isSuccess = ref(false)
const isError = ref(false)
const isSignedIn = ref(false)
const errorMessage = ref('')

const setSignedInFromSession = (hasSession: boolean) => {
  isSignedIn.value = hasSession
  if (hasSession) {
    clearPendingSignupEmail()
  }
}

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
        // Get user_type from localStorage (set during signup) or default to 'creator'
        const userType = (typeof window !== 'undefined' && localStorage.getItem(PENDING_USER_TYPE_KEY)) || 
                        data.session.user.user_metadata?.user_type || 
                        'creator'
        try {
          const username = data.session.user.email?.split('@')[0] || 'user'
          const { error: profileError, data: profileData } = await supabase
            .from('user_profiles')
            .upsert({
              id: data.session.user.id,
              user_type: userType,
              username: username,
              display_name: username
            }, {
              onConflict: 'id'
            })
            .select()
          
          if (profileError) {
            console.error('Error creating user profile:', profileError)
            console.error('Profile error details:', JSON.stringify(profileError, null, 2))
            console.error('User ID:', data.session.user.id, 'User Type:', userType)
            // Don't fail the confirmation if profile creation fails
          } else {
            // Clear localStorage since profile is created
            if (typeof window !== 'undefined') {
              localStorage.removeItem(PENDING_USER_TYPE_KEY)
            }
          }
        } catch (profileErr) {
          console.error('Error creating user profile:', profileErr)
          // Don't fail the confirmation if profile creation fails
        }
        
        setSignedInFromSession(!!data.session)
        isSuccess.value = true
        capture('email_confirmed', {})
        await syncResendContact(supabase)
      }
    } else {
      // Check if user is already confirmed and signed in
      await auth.handleEmailConfirmation()
      const { data: { session } } = await supabase?.auth.getSession()
      
      if (session?.user) {
        // Get user_type from localStorage (set during signup) or default to 'creator'
        const userType = (typeof window !== 'undefined' && localStorage.getItem(PENDING_USER_TYPE_KEY)) || 
                        session.user.user_metadata?.user_type || 
                        'creator'
        try {
          // Check if profile already exists
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', session.user.id)
            .single()
          
          if (!existingProfile) {
            const username = session.user.email?.split('@')[0] || 'user'
            const { error: profileError, data: profileData } = await supabase
              .from('user_profiles')
              .upsert({
                id: session.user.id,
                user_type: userType,
                username: username,
                display_name: username
              }, {
                onConflict: 'id'
              })
              .select()
            
            if (profileError) {
              console.error('Error creating user profile:', profileError)
              console.error('Profile error details:', JSON.stringify(profileError, null, 2))
              console.error('User ID:', session.user.id, 'User Type:', userType)
            } else {
              // Clear localStorage since profile is created
              if (typeof window !== 'undefined') {
                localStorage.removeItem(PENDING_USER_TYPE_KEY)
              }
            }
          } else {
            // Profile exists but might have NULL user_type - update it
            if (userType) {
              const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ user_type: userType })
                .eq('id', session.user.id)
              
              if (updateError) {
                console.error('Error updating user_type:', updateError)
              } else {
              }
            }
          }
        } catch (profileErr) {
          console.error('Error checking/creating user profile:', profileErr)
        }
        
        setSignedInFromSession(true)
        isSuccess.value = true
        capture('email_confirmed', {})
        await syncResendContact(supabase)
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

const finishConfirmation = () => {
  window.history.replaceState({}, document.title, '/')
  if (isSignedIn.value) {
    navigateTo('/')
    return
  }
  navigateTo('/?auth=signin')
}
</script>
