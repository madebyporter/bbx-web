<template>
  <div class="flex flex-col max-h-dvh min-h-dvh">
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
        <div class="col-span-full sticky top-0 z-30">
          <SearchFilter 
            v-model:show-search-modal="showSearchModal"
            :context-items="searchContextItems"
            :context-search-fields="searchContextFields"
            @open-search-modal="openSearchModal" 
            @update:search-query="searchQuery = $event" 
            @open-modal="openModal" 
            @search="handleSearch"
            @toggle-nav="handleToggleNav" 
          />
        </div>
        <slot />
      </section>
    </main>

    <!-- Music Player -->
    <Player />

    <!-- Auth Modal -->
    <div v-if="showAuthModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showAuthModal = false">
      <div class="bg-neutral-900 ring-1 ring-neutral-800 text-neutral-200 p-6 rounded-lg w-96 relative">
        <Button variant="ghost" class="absolute top-4 right-4" @click="showAuthModal = false">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.75 17.25L12 12L17.25 17.25M17.25 6.75L12 12L6.75 6.75" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </Button>
        <h2 class="text-xl font-bold mb-4">
          {{ isForgotPassword ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Sign In' }}
        </h2>
        <div
          v-if="authError === 'unconfirmed'"
          class="mb-4 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-sm text-neutral-300"
        >
          <p class="mb-2">{{ authErrorMessage }}</p>
          <button
            type="button"
            class="text-link text-amber-400 hover:text-amber-300 no-underline mr-3"
            :disabled="isResendingConfirmation"
            @click="handleResendFromModal"
          >
            {{ isResendingConfirmation ? 'Sending...' : 'Resend confirmation email' }}
          </button>
          <NuxtLink
            to="/auth/check-email"
            class="text-link text-amber-400 hover:text-amber-300 no-underline"
            @click="prepareCheckEmailNavigation"
          >
            Check email instructions
          </NuxtLink>
        </div>
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
          <div v-if="isSignUp">
            <label class="block text-sm font-medium mb-1">I am a</label>
            <select v-model="userType" required
              class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500">
              <option value="creator">Creator (content creator, songwriter, music artist)</option>
              <option value="audio_pro">Audio Pro (producer, engineer, etc.)</option>
            </select>
          </div>
          <div v-if="isForgotPassword" class="text-sm text-neutral-400">
            Enter your email address and we'll send you a link to reset your password.
          </div>
          <div v-if="!isForgotPassword && !isSignUp" class="flex justify-end">
            <button type="button" class="text-link text-xs no-underline" @click="showForgotPassword">
              Forgot password?
            </button>
          </div>
          <div class="flex justify-between items-center">
            <Button type="submit">
              {{ isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In' }}
            </Button>
            <button v-if="isForgotPassword" type="button" class="text-link text-sm no-underline" @click="backToSignIn">
              Back to Sign In
            </button>
            <button v-else type="button" class="text-link text-sm no-underline" @click="toggleAuthMode">
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

    <!-- Track Comments Drawer -->
    <TrackCommentsDrawer
      v-model:show="showTrackCommentsDrawer"
      :track="commentsTrack"
      :collection-id="commentsCollectionId"
    />

    <!-- Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, nextTick, watch } from 'vue'
import gsap from 'gsap'
import { useAuth, isEmailNotConfirmedError } from '~/composables/useAuth'
import { useAnalytics } from '~/composables/useAnalytics'
import { useToast } from '~/composables/useToast'
import { setPendingSignupEmail } from '~/utils/authStorage'
import { usePlayer } from '~/composables/usePlayer'
import {
  getDefaultFilterSortParams,
  hasActiveFilterSort,
  migrateFilterSortFromLocalStorage,
  useFilterSortCookie,
} from '~/composables/useFilterSortPersistence'
import Player from '~/components/Player.vue'
import Toast from '~/components/Toast.vue'
import TrackCommentsDrawer from '~/components/TrackCommentsDrawer.vue'

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
    latestVersionOnly?: boolean
    status?: (number | null)[]
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
const { capture } = useAnalytics()
const { showSuccess, showError, showProcessing, showInfo } = useToast()
// Start as false on both server and client, set to true in onMounted
// Initialize to true on both server and client to prevent hydration mismatch
// This ensures SSR works and client hydration matches server render
// Auth initialization happens separately in onMounted without blocking layout
const isInitialized = ref(true)
const route = useRoute()

// Determine which modal to show based on route
const isUserProfilePage = computed(() => {
  return route?.path?.startsWith('/u/') || false
})

// Determine FilterSort context based on current route
const filterSortContext = computed(() => {
  const path = route?.path
  if (!path) return null
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
const userType = ref<'creator' | 'audio_pro'>('creator')
const authError = ref<'unconfirmed' | null>(null)
const authErrorMessage = ref('')
const isResendingConfirmation = ref(false)

const clearAuthError = () => {
  authError.value = null
  authErrorMessage.value = ''
}

// Resource management state
const showModal = ref(false)
const showFilterSort = ref(false)
const showSearchModal = ref(false)
const searchQuery = ref('')
const searchContextItems = ref<any[]>([])
const searchContextFields = ref<string[]>([])
const editingResource = ref<Resource | null>(null)
const editingTrack = ref<any | null>(null)
const showTrackCommentsDrawer = ref(false)
const commentsTrack = ref<{ id: number; title?: string } | null>(null)
const commentsCollectionId = ref<number | null>(null)
const modalKey = ref(0)
const pageRef = ref<PageRef | null>(null)
const databaseRef = ref<DatabaseRef | null>(null)
const currentSearchHandler = ref<((query: string) => void) | null>(null)
const currentFiltersAndSortHandler = ref<((params: FilterSortParams) => void) | null>(null)

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
  year: { min: null as number | null, max: null as number | null },
  latestVersionOnly: false,
  status: [] as (number | null)[],
})

const musicFilterCookie = useFilterSortCookie('music')
const softwareFilterCookie = useFilterSortCookie('software')
const kitsFilterCookie = useFilterSortCookie('kits')

const activeFilterSortCookie = computed(() => {
  const ctx = filterSortContext.value
  if (ctx === 'music') return musicFilterCookie
  if (ctx === 'software') return softwareFilterCookie
  if (ctx === 'kits') return kitsFilterCookie
  return null
})

const hasActiveFilterSortState = computed(() => {
  const ctx = filterSortContext.value
  if (!ctx) return false
  return hasActiveFilterSort(activeFilterSortCookie.value?.value, ctx)
})

const clearFilterSort = () => {
  const ctx = filterSortContext.value
  if (!ctx) return

  const cookie = activeFilterSortCookie.value
  if (cookie) {
    cookie.value = null
  }

  const defaults = getDefaultFilterSortParams()
  currentSort.value = { ...defaults.sort }
  currentFilters.value = {
    price: { ...defaults.filters.price },
    os: [...defaults.filters.os],
    tags: [...defaults.filters.tags],
    genre: [...defaults.filters.genre],
    bpm: { ...defaults.filters.bpm },
    key: [...defaults.filters.key],
    mood: [...defaults.filters.mood],
    year: { ...defaults.filters.year },
    latestVersionOnly: defaults.filters.latestVersionOnly,
    status: [...defaults.filters.status],
  }

  handleFiltersAndSort(defaults)
}

const handleToggleNav = () => {
  if (navRef.value && navRef.value.toggleMobileNav) {
    navRef.value.toggleMobileNav()
  }
}

const handleMobileNavToggle = (isOpen: boolean) => {
  isMobileNavOpen.value = isOpen
}

// Auth handlers
const toggleAuthMode = () => {
  isSignUp.value = !isSignUp.value
  isForgotPassword.value = false
  clearAuthError()
}

const showForgotPassword = () => {
  isForgotPassword.value = true
  isSignUp.value = false
  clearAuthError()
}

const backToSignIn = () => {
  isForgotPassword.value = false
  isSignUp.value = false
  clearAuthError()
}

const prepareCheckEmailNavigation = () => {
  const signupEmail = email.value
  if (signupEmail) {
    setPendingSignupEmail(signupEmail)
  }
  showAuthModal.value = false
  clearAuthError()
}

const goToCheckEmail = async () => {
  prepareCheckEmailNavigation()
  await navigateTo('/auth/check-email')
}

const handleResendFromModal = async () => {
  if (!email.value || isResendingConfirmation.value) return
  isResendingConfirmation.value = true
  try {
    await auth.resendConfirmation(email.value)
    showInfo('Confirmation email sent. Check your inbox.', 8000)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not resend email'
    showError(message)
  } finally {
    isResendingConfirmation.value = false
  }
}

const openAuthFromQuery = () => {
  if (!process.client || user.value) return
  const authMode = route.query.auth
  if (authMode === 'signup') {
    openAuthModal('signup')
    const nextQuery = { ...route.query }
    delete nextQuery.auth
    navigateTo({ path: route.path, query: nextQuery }, { replace: true })
  } else if (authMode === 'signin') {
    openAuthModal('signin')
    const nextQuery = { ...route.query }
    delete nextQuery.auth
    navigateTo({ path: route.path, query: nextQuery }, { replace: true })
  }
}

const handleSubmit = async () => {
  clearAuthError()
  try {
    if (isForgotPassword.value) {
      await auth.resetPassword(email.value)
      showInfo('Password reset email sent! Please check your inbox and follow the link to reset your password.', 8000)
      showAuthModal.value = false
      email.value = ''
      password.value = ''
      isForgotPassword.value = false
    } else if (isSignUp.value) {
      const signupEmail = email.value
      const signupUserType = userType.value
      const result = await auth.signUp(signupEmail, password.value, signupUserType)
      capture('signup_completed', { user_type: signupUserType, method: 'email' })
      if (result.user && !result.session) {
        setPendingSignupEmail(signupEmail)
        showAuthModal.value = false
        email.value = ''
        password.value = ''
        userType.value = 'creator'
        await navigateTo('/auth/check-email')
        return
      }
      showSuccess('Account created successfully!')
      showAuthModal.value = false
      email.value = ''
      password.value = ''
      userType.value = 'creator'
    } else {
      const signInEmail = email.value
      await auth.signIn(signInEmail, password.value)
      capture('login_completed', {})
      showSuccess(`Welcome back, ${signInEmail}!`)
      showAuthModal.value = false
      email.value = ''
      password.value = ''
      if (typeof window !== 'undefined') {
        const redirect = sessionStorage.getItem('auth_redirect')
        if (redirect) {
          sessionStorage.removeItem('auth_redirect')
          await navigateTo(redirect)
          return
        }
      }
    }
  } catch (error: unknown) {
    console.error('Auth error:', error)
    if (isEmailNotConfirmedError(error)) {
      authError.value = 'unconfirmed'
      authErrorMessage.value =
        error instanceof Error ? error.message : 'Please confirm your email before signing in.'
      return
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    showError(`Authentication failed: ${errorMessage}`)
  }
}

watch(
  () => route.query.auth,
  () => {
    openAuthFromQuery()
  }
)

// Auth handlers moved to Nav component

// Resource management handlers
const openFilterModal = () => {
  showFilterSort.value = true
}

const openSearchModal = () => {
  // This is handled by v-model on SearchFilter now
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

interface OpenTrackCommentsDetail {
  track: { id: number; title?: string }
  collectionId?: number | null
}

const handleOpenTrackComments = (detail: OpenTrackCommentsDetail) => {
  commentsTrack.value = detail.track
  commentsCollectionId.value = detail.collectionId ?? null
  showTrackCommentsDrawer.value = true
}

const onOpenTrackCommentsEvent = (event: Event) => {
  handleOpenTrackComments((event as CustomEvent<OpenTrackCommentsDetail>).detail)
}

const closeModal = () => {
  showModal.value = false
  editingResource.value = null
  editingTrack.value = null
}

const refreshDatabase = (updatedTrack?: any) => {
  // For user profile pages, dispatch window event with updated track data
  if (isUserProfilePage.value) {
    const event = new CustomEvent('track-updated', { 
      detail: updatedTrack ? { track: updatedTrack } : null,
      bubbles: true
    })
    window.dispatchEvent(event)
    
    // Also update player if track was updated
    if (updatedTrack) {
      const { updateCurrentTrack } = usePlayer()
      updateCurrentTrack(updatedTrack)
    }
  }
  // For resource pages, refresh database grid
  else if (databaseRef.value?.fetchResources) {
    databaseRef.value.fetchResources()
  } else {
    console.error('Layout: Database component not found or fetchResources method not available')
  }
}

const handleFiltersAndSort = (params: FilterSortParams) => {
  
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
      year: { ...(params.filters.year || {}) },
      latestVersionOnly: params.filters.latestVersionOnly ?? false,
      status: [...(params.filters.status || [])],
    }
  }
  
  // For music pages, use registered handler first (collection, profile, group register on mount)
  if (filterSortContext.value === 'music' && currentFiltersAndSortHandler.value) {
    try {
      currentFiltersAndSortHandler.value(params)
      return
    } catch (e) {
      console.error('Layout: Error calling registered filtersAndSort handler:', e)
    }
  }

  // Nuxt 3 NuxtPage wraps the component, so we need to access the nested pageRef
  const actualPage = pageRef.value ? ((pageRef.value as any).pageRef || pageRef.value) : null

  // Fallback: for music pages without registration, try actualPage
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
  currentSearchHandler.value = handler
}

// Function for pages to unregister their search handler
const unregisterSearchHandler = () => {
  currentSearchHandler.value = null
}

// Function for music pages to register their filter/sort handler
const registerFiltersAndSortHandler = (handler: (params: FilterSortParams) => void) => {
  currentFiltersAndSortHandler.value = handler
}

// Function for music pages to unregister their filter/sort handler
const unregisterFiltersAndSortHandler = () => {
  currentFiltersAndSortHandler.value = null
}

// Function for pages to register their context items for search
const registerContextItems = (items: any[], searchFields: string[]) => {
  searchContextItems.value = items
  searchContextFields.value = searchFields
}

// Function for pages to unregister their context items
const unregisterContextItems = () => {
  searchContextItems.value = []
  searchContextFields.value = []
}

const handleSearch = (query: string) => {

  const path = route.path
  if (path.includes('/software')) {
    capture('resource_search', { query, category: 'software' })
  } else if (path.includes('/kits')) {
    capture('resource_search', { query, category: 'kits' })
  }
  
  // Use registered search handler if available
  if (currentSearchHandler.value) {
    currentSearchHandler.value(query)
  }
  // Fallback: Try pageRef for resource pages
  else if (pageRef.value && typeof pageRef.value.handleSearch === 'function') {
    pageRef.value.handleSearch(query)
  }
  // Fallback: Try pageRef.database for resource pages
  else if (pageRef.value?.database && typeof (pageRef.value.database as any)?.handleSearch === 'function') {
    ;(pageRef.value.database as any).handleSearch(query)
  }
  // Fallback: Try databaseRef
  else if (databaseRef.value?.handleSearch) {
    databaseRef.value.handleSearch(query)
  } else {
  }
}

// Handle "I Use This" signup flow
const handleShowSignup = () => {
  if (!user.value) {
    const sourcePage = route.path
    capture('signup_cta_clicked', { source_page: sourcePage })
    showAuthModal.value = true
    isSignUp.value = true
    capture('signup_started', { user_type: userType.value })
  }
}

// Generic auth modal opener
const openAuthModal = (mode: 'signin' | 'signup' | 'forgot' = 'signin') => {
  if (mode === 'forgot') {
    isForgotPassword.value = true
    isSignUp.value = false
  } else if (mode === 'signup') {
    isSignUp.value = true
    isForgotPassword.value = false
    capture('signup_started', { user_type: userType.value })
  } else {
    // signin
    isSignUp.value = false
    isForgotPassword.value = false
  }
  showAuthModal.value = true
}

// Provide functions for child layouts
provide('openFilterModal', openFilterModal)
provide('clearFilterSort', clearFilterSort)
provide('hasActiveFilterSort', hasActiveFilterSortState)
provide('handleSearch', handleSearch)
provide('registerSearchHandler', registerSearchHandler)
provide('unregisterSearchHandler', unregisterSearchHandler)
provide('registerFiltersAndSortHandler', registerFiltersAndSortHandler)
provide('unregisterFiltersAndSortHandler', unregisterFiltersAndSortHandler)
provide('registerContextItems', registerContextItems)
provide('unregisterContextItems', unregisterContextItems)
provide('handleToggleNav', handleToggleNav)
provide('handleEdit', handleEdit)
provide('handleShowSignup', handleShowSignup)
provide('openAuthModal', openAuthModal)
provide('showModal', { value: showModal })

// Listen for edit-track events from profile page
onMounted(async () => {
  if (!process.client) return
  
  // isInitialized is already true (set in ref initialization above)
  // This ensures layout always renders, preventing hydration mismatch
  
  try {
    await auth.init()
  } catch (error) {
    console.error('Auth init error:', error)
  }

  migrateFilterSortFromLocalStorage('music', musicFilterCookie)
  migrateFilterSortFromLocalStorage('software', softwareFilterCookie)
  migrateFilterSortFromLocalStorage('kits', kitsFilterCookie)

  openAuthFromQuery()
  
  // Wait for next tick to ensure router is initialized
  await nextTick()
  
  // Listen for track edit events
  window.addEventListener('edit-track', ((event: CustomEvent) => {
    handleEditTrack(event.detail)
  }) as EventListener)

  window.addEventListener('open-track-comments', onOpenTrackCommentsEvent)
  
  // Listen for upload modal open events
  window.addEventListener('open-upload-modal', (() => {
    openModal()
  }) as EventListener)
})

// Cleanup on unmount
onUnmounted(() => {
  auth.cleanup()
  window.removeEventListener('edit-track', handleEditTrack as EventListener)
  window.removeEventListener('open-track-comments', onOpenTrackCommentsEvent)
  window.removeEventListener('open-upload-modal', openModal as EventListener)
})
</script>
