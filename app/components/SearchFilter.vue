<template>
  <div ref="searchFilterRef" class="relative lg:h-20 bg-neutral-900 flex flex-col lg:flex-row gap-2 lg:gap-4 p-4 border-b border-neutral-800">
    <div class="flex flex-row gap-4 w-full justify-between lg:w-full">
      <button @click="$emit('toggle-nav')" class="btn w-fit !px-2 flex items-center lg:hidden rounded-sm">
        <svg viewBox="0 0 13 11" fill="none" xmlns="http://www.w3.org/2000/svg" class="min-w-4">
          <path d="M0 0.5H12.25V2.25H0V0.5ZM0 4.875H12.25V6.625H0V4.875ZM12.25 9.25V11H0V9.25H12.25Z"
            class="fill-neutral-400" />
        </svg>
      </button>
      <div class="grow flex relative">
        <div class="absolute z-10 top-[50%] translate-y-[-50%] px-4">
          <svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path class="fill-neutral-700"
              d="M10.0625 6.4375C10.0625 4.87891 9.21484 3.45703 7.875 2.66406C6.50781 1.87109 4.83984 1.87109 3.5 2.66406C2.13281 3.45703 1.3125 4.87891 1.3125 6.4375C1.3125 8.02344 2.13281 9.44531 3.5 10.2383C4.83984 11.0312 6.50781 11.0312 7.875 10.2383C9.21484 9.44531 10.0625 8.02344 10.0625 6.4375ZM9.21484 10.9219C8.23047 11.6875 7 12.125 5.6875 12.125C2.54297 12.125 0 9.58203 0 6.4375C0 3.32031 2.54297 0.75 5.6875 0.75C8.80469 0.75 11.375 3.32031 11.375 6.4375C11.375 7.77734 10.9102 9.00781 10.1445 9.99219L13.5352 13.3828L14 13.8477L13.0703 14.75L12.6055 14.2852L9.21484 10.8945V10.9219Z" />
          </svg>
        </div>
        <input ref="searchInput" type="text" v-model="searchQuery" @input="onInput" @focus="onFocus"
          class="font-semibold text-lg rounded-full bg-neutral-800 ring-1 ring-neutral-800 hover:ring-neutral-700 text-left p-2 lg:p-4 px-12 grow z-0 relative w-full lg:w-auto text-neutral-200 placeholder:text-neutral-500"
          placeholder="Search (CMD/CTRL+K)" />
      </div>
    </div>
    <div v-if="hasUser && shouldShowUploadButton" class="flex flex-row gap-2 lg:gap-4 w-full justify-between lg:w-auto">
      <button  @click="$emit('open-modal')" class="btn w-full lg:w-fit">
        {{ buttonText }}
      </button>
    </div>
    
    <!-- Search Modal Drawer - Positioned absolutely relative to this container -->
    <SearchModal 
      v-if="isModalVisible"
      :show="isModalVisible"
      :initial-query="searchQuery"
      :context-items="contextItems"
      :context-search-fields="contextSearchFields"
      @update:show="showSearchModalModel = $event"
      @close="showSearchModalModel = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import SearchModal from '~/components/SearchModal.vue'

interface Props {
  showSearchModal?: boolean
  contextItems?: any[]
  contextSearchFields?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  showSearchModal: false,
  contextItems: () => [],
  contextSearchFields: () => []
})

// Use v-model for showSearchModal
const showSearchModalModel = defineModel<boolean>('showSearchModal', { default: false })

// Use the model value instead of prop
const isModalVisible = computed(() => showSearchModalModel.value)

const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const searchFilterRef = ref<HTMLElement | null>(null)
const emit = defineEmits<{
  'open-modal': []
  'open-search-modal': []
  'search': [query: string]
  'toggle-nav': []
  'update:search-query': [query: string]
}>()

// Get user from useAuth composable
const auth = useAuth()
const user = computed(() => auth.user.value)
const isReady = computed(() => auth.isReady.value)
const { supabase } = useSupabase()

// Get current route (Nuxt auto-imports useRoute)
const route = useRoute()

// User type state
const userType = ref<'creator' | 'audio_pro' | null>(null)

// Fetch user type when user is available
const fetchUserType = async () => {
  if (!user.value || !supabase) {
    userType.value = null
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.value.id)
      .single()
    
    if (error) throw error
    
    if (data) {
      userType.value = (data.user_type as 'creator' | 'audio_pro') || null
    }
  } catch (error) {
    console.error('Error fetching user type:', error)
    userType.value = null
  }
}

// Watch for user changes to fetch user type
watch(() => user.value, async (newUser) => {
  if (newUser) {
    await fetchUserType()
  } else {
    userType.value = null
  }
}, { immediate: true })

// Add a computed property for user state
const hasUser = computed(() => {
  if (!isReady.value) return false
  return !!user.value
})

// Determine button text based on route
const isUserProfilePage = computed(() => {
  return route?.path?.startsWith('/u/') || false
})

// Check if we should show the upload button
// Hide it if user is a creator viewing their own profile
const shouldShowUploadButton = computed(() => {
  if (!hasUser.value) return false
  if (!isUserProfilePage.value) return true // Always show "Submit" on non-profile pages
  
  // On profile pages, check if it's the user's own profile
  const profileId = route?.params?.id as string
  const isOwnProfile = user.value && profileId === user.value.id
  
  // Hide upload button if creator viewing own profile
  if (isOwnProfile && userType.value === 'creator') {
    return false
  }
  
  return true
})

const buttonText = computed(() => {
  return isUserProfilePage.value ? 'Upload' : 'Submit'
})

// Clear search when route changes
watch(() => route?.path, (newPath) => {
  if (newPath) {
    searchQuery.value = ''
    emit('update:search-query', '')
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const onInput = () => {
  emit('update:search-query', searchQuery.value)
  showSearchModalModel.value = true
  // Also emit 'search' for backward compatibility during migration
  emit('search', searchQuery.value)
}

const onFocus = () => {
  showSearchModalModel.value = true
}

const handleKeydown = (e: KeyboardEvent) => {
  // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault() // Prevent default browser behavior
    searchInput.value?.focus()
    showSearchModalModel.value = true
  }
}


</script>