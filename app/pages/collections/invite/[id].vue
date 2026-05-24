<template>
  <div class="grow bg-neutral-900 flex items-center justify-center p-4">
    <div class="bg-neutral-800 p-8 rounded-lg max-w-md w-full">
      <div v-if="isLoading" class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Loading collection...</h2>
        <p class="text-neutral-400">Please wait while we load the collection details.</p>
      </div>
      
      <div v-else-if="isError" class="text-center">
        <div class="text-red-500 text-4xl mb-4">✗</div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Collection Not Found</h2>
        <p class="text-neutral-400 mb-4">{{ errorMessage }}</p>
        <Button variant="secondary" @click="goHome">
          Go Home
        </Button>
      </div>
      
      <div v-else-if="collection" class="text-center">
        <div v-if="isSuccess" class="mb-4">
          <div class="text-green-500 text-4xl mb-4">✓</div>
          <h2 class="text-xl font-bold text-neutral-200 mb-2">Successfully Joined!</h2>
          <p class="text-neutral-400 mb-4">You've been added to this collection.</p>
        </div>
        
        <div v-else>
          <h2 class="text-xl font-bold text-neutral-200 mb-2">{{ collection.name }}</h2>
          <p v-if="collection.description" class="text-neutral-400 mb-4">{{ collection.description }}</p>
          
          <div v-if="!user" class="mb-6">
            <p class="text-neutral-400 mb-4">Please sign in to join this collection.</p>
            <Button @click="goToSignIn">
              Sign In
            </Button>
          </div>
          
          <div v-else-if="isAlreadyMember" class="mb-6">
            <p class="text-neutral-400 mb-4">You're already a member of this collection.</p>
            <NuxtLink
              :to="`/u/${collectionOwnerUsername || collection.user_id}/c/${collection.slug}`"
              class="inline-flex items-center justify-center font-medium transition-colors bg-amber-500 text-black hover:bg-amber-600 px-4 py-2 text-base rounded min-h-8"
            >
              View Collection
            </NuxtLink>
          </div>
          
          <div v-else class="mb-6">
            <p class="text-neutral-400 mb-4">Would you like to join this collection?</p>
            <div class="flex gap-2 justify-center">
              <Button
                :disabled="isAccepting"
                @click="handleAccept"
              >
                {{ isAccepting ? 'Joining...' : 'Join Collection' }}
              </Button>
              <Button variant="secondary" @click="goHome">
                Cancel
              </Button>
            </div>
          </div>
        </div>
        
        <div v-if="isSuccess || isAlreadyMember">
          <NuxtLink
            :to="`/u/${collectionOwnerUsername || collection.user_id}/c/${collection.slug}`"
            class="inline-flex items-center justify-center font-medium transition-colors bg-amber-500 text-black hover:bg-amber-600 px-4 py-2 text-base rounded min-h-8"
          >
            View Collection
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import { useToast } from '~/composables/useToast'
import { useAnalytics } from '~/composables/useAnalytics'
import { acceptCollectionInvite, isCollectionMember } from '~/utils/collections'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { supabase } = useSupabase()
const { showSuccess, showError } = useToast()
const { capture } = useAnalytics()

const collectionId = parseInt(route.params.id as string)
const collection = ref<any>(null)
const collectionOwnerUsername = ref<string | null>(null)
const isLoading = ref(true)
const isError = ref(false)
const isSuccess = ref(false)
const isAlreadyMember = ref(false)
const isAccepting = ref(false)
const errorMessage = ref('')

const fetchCollection = async () => {
  if (!supabase || isNaN(collectionId)) {
    isError.value = true
    errorMessage.value = 'Invalid collection ID'
    isLoading.value = false
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .maybeSingle()
    
    if (error || !data) {
      isError.value = true
      errorMessage.value = 'Collection not found'
      isLoading.value = false
      return
    }
    
    collection.value = data
    
    // Fetch collection owner username
    if (data.user_id) {
      const { data: ownerData } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', data.user_id)
        .maybeSingle()
      
      if (ownerData?.username) {
        collectionOwnerUsername.value = ownerData.username
      }
    }
    
    // Check if user is already a member
    if (user.value) {
      const member = await isCollectionMember(collectionId, user.value.id)
      isAlreadyMember.value = member
    }
  } catch (error) {
    console.error('Error fetching collection:', error)
    isError.value = true
    errorMessage.value = 'Failed to load collection'
  } finally {
    isLoading.value = false
  }
}

const handleAccept = async () => {
  if (!user.value) {
    goToSignIn()
    return
  }
  
  isAccepting.value = true
  
  try {
    await acceptCollectionInvite(collectionId, user.value.id)
    capture('collection_invite_accepted', { collection_id: collectionId })
    isSuccess.value = true
    isAlreadyMember.value = true
    showSuccess('Successfully joined the collection!')
  } catch (error: any) {
    console.error('Error accepting invite:', error)
    showError(error.message || 'Failed to join collection')
  } finally {
    isAccepting.value = false
  }
}

const goToSignIn = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('auth_redirect', route.fullPath)
  }
  router.push(`/?auth=signin`)
}

const goHome = () => {
  router.push('/')
}

onMounted(() => {
  fetchCollection()
})
</script>
