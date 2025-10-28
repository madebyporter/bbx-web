<template>
  <div v-if="isInitialized" class="flex flex-col max-h-dvh min-h-dvh">
    <!-- Mobile Nav Backdrop -->
    <div 
      v-if="isMobileNavOpen" 
      @click="handleToggleNav"
      class="fixed inset-0 bg-black/50 z-30 lg:hidden"
    ></div>

    <main class="flex flex-row justify-stretch items-stretch gap-0 transition-all duration-300 grow overflow-hidden">
      <Nav ref="navRef" @show-auth-modal="showAuthModal = true" @show-admin-modal="showAdminModal = true"
        @toggle-mobile-nav="handleMobileNavToggle" />
      <section id="content" class="gap-0 grow w-full flex flex-col overflow-y-auto">
        <div class="col-span-full sticky top-0 z-50">
          <SearchFilter @open-filter-modal="openFilterModal" @open-modal="openModal" @search="handleSearch"
            @toggle-nav="handleToggleNav" />
        </div>
        <NuxtPage ref="pageRef" @edit-resource="handleEdit" @show-signup="handleShowSignup" />
      </section>
    </main>

    <!-- Music Player -->
    <Player />

    <!-- Auth Modal -->
    <div v-if="showAuthModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showAuthModal = false">
      <div class="bg-neutral-900 ring-1 ring-neutral-800 text-neutral-200 p-6 rounded-lg w-96 relative">
        <button @click="showAuthModal = false" class="absolute top-4 right-4 text-neutral-400 hover:text-neutral-300">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.75 17.25L12 12L17.25 17.25M17.25 6.75L12 12L6.75 6.75" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h2 class="text-xl font-bold mb-4">
          {{ isForgotPassword ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Sign In' }}
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <input v-model="email" type="email" required
              class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500" />
          </div>
          <div v-if="!isForgotPassword">
            <label class="block text-sm font-medium mb-1">Password</label>
            <input v-model="password" type="password" required
              class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500" />
          </div>
          <div v-if="isForgotPassword" class="text-sm text-neutral-400">
            Enter your email address and we'll send you a link to reset your password.
          </div>
          <div v-if="!isForgotPassword && !isSignUp" class="flex justify-end">
            <button type="button" @click="showForgotPassword" class="text-xs text-neutral-400 hover:text-neutral-300">
              Forgot password?
            </button>
          </div>
          <div class="flex justify-between items-center">
            <button type="submit"
              class="bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-600 transition-colors">
              {{ isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In' }}
            </button>
            <button v-if="isForgotPassword" type="button" @click="backToSignIn" class="text-sm text-neutral-400 hover:text-neutral-300">
              Back to Sign In
            </button>
            <button v-else type="button" @click="toggleAuthMode" class="text-sm text-neutral-400 hover:text-neutral-300">
              {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Manage Submissions Drawer -->
    <ManageSubmissions v-model:show="showAdminModal" :canEdit="isAdmin" />

    <!-- Conditional Modal: SubmitResource, EditTrack, or UploadMusic -->
    <SubmitResource 
      v-if="!isUserProfilePage"
      :key="modalKey" 
      v-model:show="showModal" 
      :edit-mode="!!editingResource"
      :resource-to-edit="editingResource" 
      @close="closeModal" 
      @resource-added="refreshDatabase"
      @resource-updated="refreshDatabase" 
    />
    <EditTrack 
      v-else-if="editingTrack"
      :key="`edit-track-${modalKey}`"
      v-model:show="showModal"
      :track-to-edit="editingTrack"
      @track-updated="(updatedTrack) => refreshDatabase(updatedTrack)"
    />
    <UploadMusic 
      v-else
      :key="`upload-music-${modalKey}`"
      v-model:show="showModal"
      @music-uploaded="refreshDatabase"
    />

    <!-- Filter Modal -->
    <FilterSort 
      v-if="filterSortContext"
      v-model:show="showFilterSort" 
      :context="filterSortContext"
      :initial-sort="currentSort" 
      :initial-filters="currentFilters"
      @apply-filters="handleFiltersAndSort" 
    />

    <!-- Toast Notifications -->
    <Toast />
  </div>
  <div v-else class="flex items-center justify-center min-h-screen">
    <!-- No loading indicator -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import gsap from 'gsap'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import Player from '~/components/Player.vue'
import Toast from '~/components/Toast.vue'

// Define interfaces
interface DatabaseComponent {
  fetchResources: () => Promise<void>
  handleSearch: (query: string) => void
  updateFiltersAndSort: (params: FilterSortParams) => void
}

interface DatabaseRef {
  database?: any
  fetchResources?: () => Promise<void>
  handleSearch?: (query: string) => void
  updateFiltersAndSort?: (params: FilterSortParams) => void
  [key: string]: any
}

interface NavRef {
  mobileNav?: any
  toggleMobileNav?: () => void
}

interface PageRef {
  database?: {
    value?: DatabaseRef
  }
  databaseGrid?: {
    value?: DatabaseRef
  }
  updateFiltersAndSort?: (params: FilterSortParams) => void
  [key: string]: any
}

interface FilterSortParams {
  sort: {
    sortBy: string
    sortDirection: 'asc' | 'desc'
  }
  filters: {
    // Software/Kits filters
    price: { free: boolean; paid: boolean }
    os: string[]
    tags: string[]
    // Music filters
    genre: string[]
    bpm: { min: number | null; max: number | null }
    key: string[]
    mood: string[]
    year: { min: number | null; max: number | null }
  }
}

interface ResourceType {
  id: number
  slug: string
  display_name: string
  created_at: string
}

interface Resource {
  id: number
  name: string
  creator: string
  price: string
  link: string
  image_url: string | null
  os: string[]
  tags: string[]
  type: ResourceType
}

const auth = useAuth()
const { user, isAdmin } = auth
const { showSuccess, showError, showProcessing, showInfo } = useToast()
const isInitialized = ref(false)
const route = useRoute()

// Determine which modal to show based on route
const isUserProfilePage = computed(() => {
  return route.path.startsWith('/u/')
})

// Determine FilterSort context based on current route
const filterSortContext = computed(() => {
  const path = route.path
  if (path.includes('/software')) return 'software'
  if (path.includes('/kits')) return 'kits'
  if (path.startsWith('/u/') && !path.includes('/t/')) return 'music' // Exclude single track pages
  return null
})

// Auth state
const showAuthModal = ref(false)
const showAdminModal = ref(false)
const isSignUp = ref(false)
const isForgotPassword = ref(false)
const email = ref('')
const password = ref('')

// Resource management state
const showModal = ref(false)
const showFilterSort = ref(false)
const editingResource = ref<Resource | null>(null)
const editingTrack = ref<any | null>(null)
const modalKey = ref(0)
const pageRef = ref<PageRef | null>(null)
const databaseRef = ref<DatabaseRef | null>(null)
const currentSearchHandler = ref<((query: string) => void) | null>(null)

// Navigation
const navRef = ref<NavRef | null>(null)
const isMobileNavOpen = ref(false)

type SortDirection = 'asc' | 'desc'

const currentSort = ref<{ sortBy: string; sortDirection: SortDirection }>({ 
  sortBy: 'created_at', 
  sortDirection: 'desc' 
})

const currentFilters = ref({
  // Software/Kits filters
  price: { free: false, paid: false },
  os: [] as string[],
  tags: [] as string[],
  // Music filters
  genre: [] as string[],
  bpm: { min: null as number | null, max: null as number | null },
  key: [] as string[],
  mood: [] as string[],
  year: { min: null as number | null, max: null as number | null }
})

const handleToggleNav = () => {
  if (navRef.value && navRef.value.toggleMobileNav) {
    navRef.value.toggleMobileNav()
  }
}

const handleMobileNavToggle = (isOpen: boolean) => {
  isMobileNavOpen.value = isOpen
  console.log('Mobile nav toggled:', isOpen)
}

// Auth handlers
const toggleAuthMode = () => {
  isSignUp.value = !isSignUp.value
  isForgotPassword.value = false
}

const showForgotPassword = () => {
  isForgotPassword.value = true
  isSignUp.value = false
}

const backToSignIn = () => {
  isForgotPassword.value = false
  isSignUp.value = false
}

const handleSubmit = async () => {
  try {
    if (isForgotPassword.value) {
      await auth.resetPassword(email.value)
      showInfo('Password reset email sent! Please check your inbox and follow the link to reset your password.', 8000)
      showAuthModal.value = false
      email.value = ''
      password.value = ''
      isForgotPassword.value = false
    } else if (isSignUp.value) {
      const result = await auth.signUp(email.value, password.value)
      if (result.user && !result.session) {
        // User created but needs email confirmation
        showInfo('Account created! Please check your email and click the confirmation link to activate your account.', 8000)
      } else {
        // User created and signed in (email confirmation disabled)
        showSuccess('Account created successfully!')
      }
      showAuthModal.value = false
      email.value = ''
      password.value = ''
    } else {
      await auth.signIn(email.value, password.value)
      showSuccess(`Welcome back, ${email.value}!`)
      showAuthModal.value = false
      email.value = ''
      password.value = ''
    }
  } catch (error: unknown) {
    console.error('Auth error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    showError(`Authentication failed: ${errorMessage}`)
  }
}

// Auth handlers moved to Nav component

// Resource management handlers
const openFilterModal = () => {
  showFilterSort.value = true
}

const openModal = () => {
  // Clear any editing states when opening modal for new submission/upload
  editingResource.value = null
  editingTrack.value = null
  showModal.value = true
  modalKey.value++
}

const handleEdit = (resource: Resource) => {
  editingResource.value = resource
  editingTrack.value = null
  showModal.value = true
  modalKey.value++
}

const handleEditTrack = (track: any) => {
  editingTrack.value = track
  editingResource.value = null
  showModal.value = true
  modalKey.value++
}

const closeModal = () => {
  showModal.value = false
  editingResource.value = null
  editingTrack.value = null
}

const refreshDatabase = (updatedTrack?: any) => {
  // For user profile pages, dispatch window event with updated track data
  if (isUserProfilePage.value) {
    console.log('Layout: Dispatching track-updated event', updatedTrack ? 'with track data' : 'without data')
    const event = new CustomEvent('track-updated', { 
      detail: updatedTrack ? { track: updatedTrack } : null 
    })
    window.dispatchEvent(event)
  }
  // For resource pages, refresh database grid
  else if (databaseRef.value?.fetchResources) {
    console.log('Layout: Found database component, calling fetchResources')
    databaseRef.value.fetchResources()
  } else {
    console.error('Layout: Database component not found or fetchResources method not available')
  }
}

const handleFiltersAndSort = (params: FilterSortParams) => {
  console.log('Layout: Received filter params:', params)
  
  if (!params) {
    console.error('Layout: Invalid filter parameters received')
    return
  }
  
  // Update local state
  if (params.sort) {
    currentSort.value = {
      sortBy: params.sort.sortBy,
      sortDirection: params.sort.sortDirection
    }
  }
  
  if (params.filters) {
    // Make deep copies to ensure reactivity
    currentFilters.value = {
      price: { ...params.filters.price },
      os: [...params.filters.os],
      tags: [...params.filters.tags],
      genre: [...(params.filters.genre || [])],
      bpm: { ...(params.filters.bpm || {}) },
      key: [...(params.filters.key || [])],
      mood: [...(params.filters.mood || [])],
      year: { ...(params.filters.year || {}) }
    }
  }
  
  // Nuxt 3 NuxtPage wraps the component, so we need to access the nested pageRef
  const actualPage = pageRef.value ? ((pageRef.value as any).pageRef || pageRef.value) : null
  
  // For music pages, call updateFiltersAndSort directly on the page
  if (filterSortContext.value === 'music' && actualPage) {
    try {
      if (typeof actualPage.updateFiltersAndSort === 'function') {
        actualPage.updateFiltersAndSort(params)
        return
      }
    } catch (e) {
      console.error('Layout: Error calling music page updateFiltersAndSort:', e)
    }
  }
  
  // For software/kits pages, get database component reference
  let dbComponent = databaseRef.value
  
  // If direct ref doesn't work, try to get it through the page ref
  if (!dbComponent && actualPage) {
    try {
      // Check if page has exposed database property (software page)
      if (actualPage.database && actualPage.database.value) {
        dbComponent = actualPage.database.value
      } 
      // If no database property, check if page has databaseGrid property (kits page)
      else if (actualPage.databaseGrid && actualPage.databaseGrid.value) {
        dbComponent = actualPage.databaseGrid.value
      }
      // Check if page itself exposes updateFiltersAndSort (kits page with direct exposure)
      else if (typeof actualPage.updateFiltersAndSort === 'function') {
        actualPage.updateFiltersAndSort(params)
        return
      }
    } catch (e) {
      console.error('Layout: Error accessing page component:', e)
    }
  }
  
  // Attempt to update filters on database component
  if (dbComponent && typeof dbComponent.updateFiltersAndSort === 'function') {
    try {
      dbComponent.updateFiltersAndSort({
        sort: currentSort.value,
        filters: currentFilters.value
      })
    } catch (error) {
      console.error('Layout: Error applying filters:', error)
    }
  } else if (filterSortContext.value !== 'music') {
    // Only log error for software/kits pages that should have a database component
    console.error('Layout: Database component not found or updateFiltersAndSort method not available!')
  }
}

// Function for pages to register their search handler
const registerSearchHandler = (handler: (query: string) => void) => {
  console.log('Layout: Search handler registered')
  currentSearchHandler.value = handler
}

// Function for pages to unregister their search handler
const unregisterSearchHandler = () => {
  console.log('Layout: Search handler unregistered')
  currentSearchHandler.value = null
}

const handleSearch = (query: string) => {
  console.log('Layout: handleSearch called with query:', query)
  
  // Use registered search handler if available
  if (currentSearchHandler.value) {
    console.log('Layout: Using registered search handler')
    currentSearchHandler.value(query)
  }
  // Fallback: Try pageRef for resource pages
  else if (pageRef.value && typeof pageRef.value.handleSearch === 'function') {
    console.log('Layout: Found page handleSearch method')
    pageRef.value.handleSearch(query)
  }
  // Fallback: Try pageRef.database for resource pages
  else if (pageRef.value?.database && typeof (pageRef.value.database as any)?.handleSearch === 'function') {
    console.log('Layout: Found database handleSearch method via pageRef')
    ;(pageRef.value.database as any).handleSearch(query)
  }
  // Fallback: Try databaseRef
  else if (databaseRef.value?.handleSearch) {
    console.log('Layout: Found databaseRef handleSearch method')
    databaseRef.value.handleSearch(query)
  } else {
    console.log('Layout: No search handler found for current page')
  }
}

// Handle "I Use This" signup flow
const handleShowSignup = () => {
  console.log('Show signup called, current user:', user.value)
  if (!user.value) {
    showAuthModal.value = true
    isSignUp.value = true
  }
}

// Provide functions for child layouts
provide('openFilterModal', openFilterModal)
provide('handleSearch', handleSearch)
provide('registerSearchHandler', registerSearchHandler)
provide('unregisterSearchHandler', unregisterSearchHandler)
provide('handleToggleNav', handleToggleNav)
provide('handleEdit', handleEdit)
provide('handleShowSignup', handleShowSignup)
provide('showModal', { value: showModal })

// Test toast on mount (temporary for debugging)
const testToast = () => {
  console.log('Testing toast...')
  showInfo('Toast system is working! 🎉')
}

// Listen for edit-track events from profile page
onMounted(async () => {
  console.log('Layout: Starting auth initialization...')
  await auth.init()
  isInitialized.value = true
  
  // Test toast on page load (temporary)
  setTimeout(() => {
    testToast()
  }, 1000)
  
  // Listen for track edit events
  window.addEventListener('edit-track', ((event: CustomEvent) => {
    handleEditTrack(event.detail)
  }) as EventListener)
  
  // Listen for upload modal open events
  window.addEventListener('open-upload-modal', (() => {
    openModal()
  }) as EventListener)
})

// Cleanup on unmount
onUnmounted(() => {
  auth.cleanup()
  window.removeEventListener('edit-track', handleEditTrack as EventListener)
  window.removeEventListener('open-upload-modal', openModal as EventListener)
})
</script>
