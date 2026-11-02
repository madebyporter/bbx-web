<template>
  <div class="flex flex-col max-h-dvh min-h-dvh">
    <!-- Mobile Nav Backdrop -->
    <div 
      v-if="isMobileNavOpen" 
      @click="handleToggleNav"
      class="fixed inset-0 bg-black/50 z-30 lg:hidden"
    ></div>

    <!-- No transition-all: height changes (player slot) were animating the sidebar account block -->
    <main class="flex flex-row items-stretch gap-0 flex-1 min-h-0 overflow-hidden">
      <Nav ref="navRef" @show-auth-modal="openAuthModal('signin')" @show-admin-modal="showAdminModal = true"
        @toggle-mobile-nav="handleMobileNavToggle" />
      <section id="content" class="gap-0 grow w-full min-w-0 flex flex-col overflow-x-hidden overflow-y-auto">
        <div class="col-span-full sticky top-0 z-30">
          <SearchFilter 
            v-model:show-search-modal="showSearchModal"
            :context-items="searchContextItems"
            :context-search-fields="searchContextFields"
            :shell-loading="!shellContentReady"
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

    <!-- In-layout sibling of main so nav height and player slot stay one flex column -->
    <Player />

    <AuthModal ref="authModalRef" v-model:open="showAuthModal" />
    <FinishUpgradeBanner />

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

    <!-- Generate Track Video Drawer -->
    <GenerateTrackVideoDrawer
      v-model:show="showGenerateTrackVideoDrawer"
      :track="generateVideoTrack"
    />

    <!-- Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, nextTick, watch } from 'vue'
import gsap from 'gsap'
import { useAuth } from '~/composables/useAuth'
import { useAnalytics } from '~/composables/useAnalytics'
import { useToast } from '~/composables/useToast'
import { useSignupIntent } from '~/composables/useSignupIntent'
import { useCheckout } from '~/composables/useCheckout'
import { usePlans, type BillingInterval } from '~/composables/usePlans'
import { useEntitlements } from '~/composables/useEntitlements'
import type AuthModal from '~/components/AuthModal.vue'
import { usePlayer } from '~/composables/usePlayer'
import {
  getDefaultFilterSortParams,
  hasActiveFilterSort,
  migrateFilterSortFromLocalStorage,
  useFilterSortCookie,
} from '~/composables/useFilterSortPersistence'
import { providePageShellReady, useShellContentReady, isResourceShellRoute } from '~/composables/usePageShellReady'
import Player from '~/components/Player.vue'
import Toast from '~/components/Toast.vue'
import TrackCommentsDrawer from '~/components/TrackCommentsDrawer.vue'
import GenerateTrackVideoDrawer from '~/components/GenerateTrackVideoDrawer.vue'
import type { Track } from '~/types/track'

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
  description?: string | null
  image_url: string | null
  os: string[]
  tags: string[]
  type: ResourceType
}

const auth = useAuth()
const { user, isAdmin } = auth
const { capture } = useAnalytics()
const { showInfo } = useToast()
const signupIntent = useSignupIntent()
const { startCheckout, openPortal } = useCheckout()
const { findPlan, ensureLoaded } = usePlans()
const { entitlements, refresh: refreshEntitlements } = useEntitlements()
const authModalRef = ref<InstanceType<typeof AuthModal> | null>(null)
// Start as false on both server and client, set to true in onMounted
// Initialize to true on both server and client to prevent hydration mismatch
// This ensures SSR works and client hydration matches server render
// Auth initialization happens separately in onMounted without blocking layout
const isInitialized = ref(true)
const route = useRoute()
// Re-provide module-level shell refs for layout children (app.vue already provided them)
providePageShellReady()
const shellContentReady = useShellContentReady()

if (isResourceShellRoute(route.path)) {
  shellContentReady.value = true
}

watch(
  () => route.fullPath,
  (newPath) => {
    if (isResourceShellRoute(newPath)) {
      shellContentReady.value = true
    }
  }
)

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
const showGenerateTrackVideoDrawer = ref(false)
const generateVideoTrack = ref<Track | null>(null)
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

const defaultFilterParams = getDefaultFilterSortParams()

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
  latestVersionOnly: defaultFilterParams.filters.latestVersionOnly,
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

type AuthModalOpts = { plan?: string; interval?: BillingInterval; source?: string }

const openAuthModal = (
  mode: 'signin' | 'signup' | 'forgot' = 'signin',
  opts?: AuthModalOpts,
) => {
  // Logged-in users hitting signup/pricing links skip the modal
  if (user.value && mode === 'signup') {
    void handleLoggedInSignupIntent(opts)
    return
  }

  showAuthModal.value = true
  void nextTick(async () => {
    await authModalRef.value?.open(mode, opts)
  })
}

async function handleLoggedInSignupIntent(opts?: AuthModalOpts) {
  const planSlug = opts?.plan
  const interval = opts?.interval || 'month'
  if (!planSlug) {
    showInfo("You're already signed in.")
    return
  }
  await refreshEntitlements(true)
  const plan = findPlan(planSlug)
  if (!plan) {
    showInfo('That plan is not available.')
    return
  }
  if (entitlements.value?.plan_slug === plan.slug) {
    showInfo(`You're already on ${plan.name}.`)
    return
  }
  if (plan.is_default) {
    showInfo(`You're already on ${plan.name}.`)
    return
  }
  const paying =
    entitlements.value &&
    entitlements.value.plan_slug !== 'free' &&
    Boolean(entitlements.value.plan_slug)
  if (paying) {
    capture('portal_opened', { source: 'pricing' })
    await openPortal()
    return
  }
  capture('checkout_started', {
    plan: plan.slug,
    interval,
    context: 'pricing',
    plan_slug: plan.slug,
  })
  await startCheckout({ plan: plan.slug, interval, context: 'pricing' })
}

const openAuthFromQuery = () => {
  if (!import.meta.client) return

  const planParam = typeof route.query.plan === 'string' ? route.query.plan : undefined
  const intervalParam =
    route.query.interval === 'year' || route.query.interval === 'month'
      ? route.query.interval
      : undefined

  if (planParam) {
    void signupIntent.readFromQuery(route)
  }

  const authMode = route.query.auth
  if (authMode === 'signup' || authMode === 'signin') {
    if (user.value && authMode === 'signup') {
      void handleLoggedInSignupIntent({
        plan: planParam,
        interval: intervalParam,
        source: 'query',
      })
    } else if (!user.value) {
      openAuthModal(authMode, {
        plan: planParam,
        interval: intervalParam,
        source: 'query',
      })
    } else if (authMode === 'signin' && signupIntent.isPaid.value && signupIntent.intent.value) {
      // Already signed in with paid intent: start checkout
      const intent = signupIntent.intent.value
      void startCheckout({
        plan: intent.plan,
        interval: intent.interval,
        context: 'signup',
      })
    }

    const nextQuery = { ...route.query }
    delete nextQuery.auth
    // Keep plan/interval until signup is submitted (strip only auth)
    navigateTo({ path: route.path, query: nextQuery }, { replace: true })
  }
}

watch(
  () => route.query.auth,
  () => {
    openAuthFromQuery()
  },
)

watch(
  () => route.query.upgrade,
  (upgrade) => {
    if (!import.meta.client) return
    if (upgrade === 'canceled') {
      const plan = typeof route.query.plan === 'string' ? route.query.plan : 'pro'
      const interval =
        route.query.interval === 'year' || route.query.interval === 'month'
          ? route.query.interval
          : 'month'
      capture('checkout_canceled', { plan, interval })
      void signupIntent.set({ plan, interval, source: 'checkout_canceled' })
    }
  },
  { immediate: true },
)

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

const handleOpenGenerateTrackVideo = (detail: { track: Track }) => {
  generateVideoTrack.value = detail.track
  showGenerateTrackVideoDrawer.value = true
}

const onOpenGenerateTrackVideoEvent = (event: Event) => {
  handleOpenGenerateTrackVideo((event as CustomEvent<{ track: Track }>).detail)
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
      latestVersionOnly: params.filters.latestVersionOnly ?? getDefaultFilterSortParams().filters.latestVersionOnly,
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
    openAuthModal('signup', { source: sourcePage })
  }
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
  window.addEventListener('open-generate-track-video', onOpenGenerateTrackVideoEvent)
  
  // Listen for upload modal open events
  window.addEventListener('open-upload-modal', (() => {
    openModal()
  }) as EventListener)
})

// Cleanup on unmount
onUnmounted(() => {
  // Do not auth.cleanup() here — auth is an app singleton; layout remounts
  // were unsubscribing onAuthStateChange and then skipping re-init.
  window.removeEventListener('edit-track', handleEditTrack as EventListener)
  window.removeEventListener('open-track-comments', onOpenTrackCommentsEvent)
  window.removeEventListener('open-generate-track-video', onOpenGenerateTrackVideoEvent)
  window.removeEventListener('open-upload-modal', openModal as EventListener)
})
</script>
