<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Settings</h2>
    </template>

    <div class="flex flex-col gap-6 grow">
      <!-- Username Field -->
      <div class="flex flex-col gap-3">
        <label class="font-semibold text-neutral-200">Username</label>
        <div class="flex flex-col gap-2">
          <input
            v-model="username"
            type="text"
            placeholder="Enter username"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400"
            :class="{ 'border-red-500': usernameError }"
            @input="clearUsernameError"
          />
          <p v-if="usernameError" class="text-xs text-red-500">{{ usernameError }}</p>
          <p v-else class="text-xs text-neutral-500">
            Username can only contain letters, numbers, underscores, and hyphens. This will be used in your profile URL.
          </p>
        </div>
      </div>

      <!-- Display Name Field -->
      <div class="flex flex-col gap-3">
        <label class="font-semibold text-neutral-200">Display Name</label>
        <div class="flex flex-col gap-2">
          <input
            v-model="displayName"
            type="text"
            placeholder="Enter display name"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400"
          />
          <p class="text-xs text-neutral-500">
            Your display name is shown on your profile and in search results.
          </p>
        </div>
      </div>

      <!-- Email Field -->
      <div class="flex flex-col gap-3">
        <label class="font-semibold text-neutral-200">Email</label>
        <div class="flex flex-col gap-2">
          <input
            v-model="email"
            type="email"
            placeholder="Enter email address"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400"
            :class="{ 'border-red-500': emailError }"
            @input="clearEmailError"
          />
          <p v-if="emailError" class="text-xs text-red-500">{{ emailError }}</p>
          <p v-else-if="emailPendingConfirmation" class="text-xs text-amber-400">
            Email change pending confirmation. Please check both your old and new email addresses for confirmation links.
          </p>
          <p v-else class="text-xs text-neutral-500">
            Changing your email will require confirmation from both your old and new email addresses.
          </p>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex flex-row gap-3 justify-end border-t border-neutral-800 pt-4 mt-auto">
      <button
        @click="handleCancel"
        :disabled="isSaving"
        class="px-4 py-2 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        Cancel
      </button>
      <button
        @click="handleSave"
        :disabled="isSaving || !hasChanges"
        class="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-neutral-900 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {{ isSaving ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import MasterDrawer from '~/components/MasterDrawer.vue'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  'profile-updated': []
}>()

const { supabase } = useSupabase()
const { user } = useAuth()
const { showSuccess, showError } = useToast()

const drawerRef = ref<InstanceType<typeof MasterDrawer> | null>(null)

// Form state
const username = ref('')
const displayName = ref('')
const email = ref('')
const originalUsername = ref('')
const originalDisplayName = ref('')
const originalEmail = ref('')

// UI state
const isSaving = ref(false)
const usernameError = ref<string | null>(null)
const emailError = ref<string | null>(null)
const emailPendingConfirmation = ref(false)
const isLoading = ref(false)

// Computed
const hasChanges = computed(() => {
  return username.value !== originalUsername.value || 
         displayName.value !== originalDisplayName.value ||
         email.value !== originalEmail.value
})

// Methods
const clearUsernameError = () => {
  usernameError.value = null
}

const clearEmailError = () => {
  emailError.value = null
  emailPendingConfirmation.value = false
}

const fetchProfile = async () => {
  if (!user.value || !supabase) return
  
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username, display_name')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching profile:', error)
      showError('Failed to load profile data')
      return
    }
    
    // Get current email from auth user
    const currentEmail = user.value.email || ''
    
    // If profile exists, use its data; otherwise use empty strings (new user)
    if (data) {
      username.value = data.username || ''
      displayName.value = data.display_name || ''
      originalUsername.value = data.username || ''
      originalDisplayName.value = data.display_name || ''
    } else {
      // New user - initialize with empty values
      username.value = ''
      displayName.value = ''
      originalUsername.value = ''
      originalDisplayName.value = ''
    }
    
    // Set email from auth user
    email.value = currentEmail
    originalEmail.value = currentEmail
  } catch (error) {
    console.error('Error fetching profile:', error)
    showError('Failed to load profile data')
  } finally {
    isLoading.value = false
  }
}

const validateUsername = (): boolean => {
  if (!username.value.trim()) {
    usernameError.value = 'Username cannot be empty'
    return false
  }
  
  let normalizedUsername = username.value.trim().toLowerCase()
  
  // Remove @ if user included it
  if (normalizedUsername.startsWith('@')) {
    normalizedUsername = normalizedUsername.slice(1)
  }
  
  // Validate username format (alphanumeric, underscore, hyphen)
  if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
    usernameError.value = 'Username can only contain letters, numbers, underscores, and hyphens'
    return false
  }
  
  // Update the username value to normalized version
  username.value = normalizedUsername
  
  return true
}

const validateEmail = (): boolean => {
  if (!email.value.trim()) {
    emailError.value = 'Email cannot be empty'
    return false
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value.trim())) {
    emailError.value = 'Please enter a valid email address'
    return false
  }
  
  return true
}

const handleSave = async () => {
  if (!user.value || !supabase) return
  
  // Clear previous errors
  usernameError.value = null
  emailError.value = null
  emailPendingConfirmation.value = false
  
  // Validate username
  if (!validateUsername()) {
    return
  }
  
  // Validate email if changed
  if (email.value !== originalEmail.value && !validateEmail()) {
    return
  }
  
  isSaving.value = true
  
  try {
    // Check if username is already taken (if changed)
    if (username.value !== originalUsername.value) {
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username.value)
        .neq('id', user.value.id)
        .maybeSingle()
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError
      }
      
      if (existingUser) {
        usernameError.value = 'This username is already taken'
        isSaving.value = false
        return
      }
    }
    
    // Build profile data - use upsert to create if doesn't exist
    const profileData: { 
      id: string
      username?: string
      display_name?: string | null
      user_type?: string
    } = {
      id: user.value.id
    }
    
    // Always set username (required for new profiles)
    if (username.value) {
      profileData.username = username.value
    }
    
    // Set display_name (can be null)
    profileData.display_name = displayName.value.trim() || null
    
    // For new profiles, set default user_type if not already set
    // Check if profile exists first
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (!existingProfile) {
      // New profile - set default user_type
      profileData.user_type = 'creator'
    }
    
    // Use upsert to create or update profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'id'
      })
    
    if (profileError) throw profileError
    
    // Handle email change if email was modified
    if (email.value !== originalEmail.value) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: email.value.trim()
      })
      
      if (emailError) {
        throw emailError
      }
      
      // Email change initiated - Supabase will send confirmation emails
      // Don't update originalEmail yet - wait for confirmation
      emailPendingConfirmation.value = true
      showSuccess('Confirmation emails sent to both your old and new email addresses. Please check your emails to complete the change.')
      
      // Update other original values
      originalUsername.value = username.value
      originalDisplayName.value = displayName.value
      
      // Don't close drawer immediately - let user see the confirmation message
      // They can close it manually
    } else {
      // Update original values
      originalUsername.value = username.value
      originalDisplayName.value = displayName.value
      
      showSuccess('Profile updated successfully')
      emit('profile-updated')
      
      // Close drawer after a short delay
      setTimeout(() => {
        emit('update:show', false)
      }, 500)
    }
  } catch (error: any) {
    console.error('Error saving profile:', error)
    showError(error.message || 'Failed to save profile')
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  // Reset to original values
  username.value = originalUsername.value
  displayName.value = originalDisplayName.value
  email.value = originalEmail.value
  usernameError.value = null
  emailError.value = null
  emailPendingConfirmation.value = false
  emit('update:show', false)
}

// Watch for drawer opening to fetch profile data
watch(() => props.show, (newVal) => {
  if (newVal && user.value) {
    fetchProfile()
    // Reset email pending state when opening drawer
    emailPendingConfirmation.value = false
  }
}, { immediate: true })

// Watch for user email changes (after confirmation)
watch(() => user.value?.email, (newEmail) => {
  if (newEmail && newEmail !== originalEmail.value) {
    // Email was confirmed - update original email
    originalEmail.value = newEmail
    email.value = newEmail
    emailPendingConfirmation.value = false
  }
})
</script>
