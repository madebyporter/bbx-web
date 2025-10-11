<template>
  <div v-if="isInitialized">
    <main class="grid grid-cols-12 gap-0 min-h-svh transition-all duration-300">
      <Nav ref="navRef" @show-auth-modal="showAuthModal = true" @show-admin-modal="showAdminModal = true"
        @toggle-mobile-nav="handleMobileNavToggle" />
      <section id="content"
        class="col-start-1 col-span-12 lg:col-start-4 lg:col-span-9 xl:col-start-3 xl:col-span-10 grid grid-cols-subgrid gap-0 content-start lg:pl-4">
        <div class="col-span-full sticky top-0 z-50">
          <SearchFilter @open-filter-modal="openFilterModal" @open-modal="showModal = true" @search="handleSearch"
            @toggle-nav="handleToggleNav" />
        </div>
        <slot @edit-resource="handleEdit" @show-signup="handleShowSignup" />
      </section>
    </main>

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
        <h2 class="text-xl font-bold mb-4">{{ isSignUp ? 'Sign Up' : 'Sign In' }}</h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <input v-model="email" type="email" required
              class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Password</label>
            <input v-model="password" type="password" required
              class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500" />
          </div>
          <div class="flex justify-between items-center">
            <button type="submit"
              class="bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-600 transition-colors">
              {{ isSignUp ? 'Sign Up' : 'Sign In' }}
            </button>
            <button type="button" @click="toggleAuthMode" class="text-sm text-neutral-400 hover:text-neutral-300">
              {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Manage Submissions Drawer -->
    <ManageSubmissions v-model:show="showAdminModal" :canEdit="isAdmin" />

    <!-- Conditional Modal: SubmitResource or UploadMusic -->
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
    <UploadMusic 
      v-else
      v-model:show="showModal"
      @music-uploaded="refreshDatabase"
    />

    <!-- Filter Modal -->
    <FilterSort v-model:show="showFilterSort" :initial-sort="currentSort" :initial-filters="currentFilters"
      @apply-filters="handleFiltersAndSort" />
  </div>
  <div v-else class="flex items-center justify-center min-h-screen">
    <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import gsap from 'gsap'
import { useAuth } from '~/composables/useAuth'

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
    price: { free: boolean; paid: boolean }
    os: string[]
    tags: string[]
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
const isInitialized = ref(false)
const route = useRoute()

// Determine which modal to show based on route
const isUserProfilePage = computed(() => {
  return route.path.startsWith('/u/')
})

// Auth state
const showAuthModal = ref(false)
const showAdminModal = ref(false)
const isSignUp = ref(false)
const email = ref('')
const password = ref('')

// Resource management state
const showModal = ref(false)
const showFilterSort = ref(false)
const editingResource = ref<Resource | null>(null)
const modalKey = ref(0)
const pageRef = ref<PageRef | null>(null)
const databaseRef = ref<DatabaseRef | null>(null)

// Navigation
const navRef = ref<NavRef | null>(null)

type SortDirection = 'asc' | 'desc'

const currentSort = ref<{ sortBy: string; sortDirection: SortDirection }>({ 
  sortBy: 'created_at', 
  sortDirection: 'desc' 
})

const currentFilters = ref({
  price: { free: false, paid: false },
  os: [] as string[],
  tags: [] as string[]
})

const handleToggleNav = () => {
  if (navRef.value && navRef.value.toggleMobileNav) {
    navRef.value.toggleMobileNav()
  }
}

const handleMobileNavToggle = (isOpen: boolean) => {
  // Handle mobile nav toggle if needed
  console.log('Mobile nav toggled:', isOpen)
}

// Auth handlers
const toggleAuthMode = () => {
  isSignUp.value = !isSignUp.value
}

const handleSubmit = async () => {
  try {
    if (isSignUp.value) {
      await auth.signUp(email.value, password.value)
    } else {
      await auth.signIn(email.value, password.value)
    }
    showAuthModal.value = false
    email.value = ''
    password.value = ''
  } catch (error: unknown) {
    console.error('Auth error:', error)
    alert(error instanceof Error ? error.message : 'Unknown error')
  }
}

// Auth handlers moved to Nav component

// Resource management handlers
const openFilterModal = () => {
  showFilterSort.value = true
}

const handleEdit = (resource: Resource) => {
  editingResource.value = resource
  showModal.value = true
  modalKey.value++
}

const closeModal = () => {
  showModal.value = false
  editingResource.value = null
}

const refreshDatabase = () => {
  // For user profile pages, reload the page to refresh tracks
  if (isUserProfilePage.value) {
    console.log('Layout: Reloading page to refresh tracks')
    window.location.reload()
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
      tags: [...params.filters.tags]
    }
  }
  
  console.log('Layout: Updated filters to:', {
    price: currentFilters.value.price,
    os: currentFilters.value.os,
    tags: currentFilters.value.tags
  })
  
  // Get database component reference - try different approaches to find it
  // First try direct reference
  let dbComponent = databaseRef.value
  
  // If direct ref doesn't work, try to get it through the page ref
  if (!dbComponent && pageRef.value) {
    console.log('Layout: Trying to find database component through page ref')
    
    try {
      // Check if page has exposed database property
      if (pageRef.value.database && pageRef.value.database.value) {
        dbComponent = pageRef.value.database.value
        console.log('Layout: Found database component through page database property')
      } 
      // If no database property, check if page has databaseGrid property
      else if (pageRef.value.databaseGrid && pageRef.value.databaseGrid.value) {
        dbComponent = pageRef.value.databaseGrid.value
        console.log('Layout: Found database component through page databaseGrid property')
      }
      // Check if page is directly exposing component methods
      else if (typeof pageRef.value.updateFiltersAndSort === 'function') {
        console.log('Layout: Using page component methods directly')
        pageRef.value.updateFiltersAndSort(params)
        return
      }
    } catch (e) {
      console.error('Layout: Error accessing page component:', e)
    }
  }
  
  // Attempt to update filters
  if (dbComponent && typeof dbComponent.updateFiltersAndSort === 'function') {
    console.log('Layout: Database component found, updating filters')
    try {
      dbComponent.updateFiltersAndSort({
        sort: currentSort.value,
        filters: currentFilters.value
      })
    } catch (error) {
      console.error('Layout: Error applying filters:', error)
    }
  } else {
    console.error('Layout: Database component not found or updateFiltersAndSort method not available!')
    
    // Last resort - try to find any component with updateFiltersAndSort method
    if (pageRef.value) {
      console.log('Layout: Attempting to find updateFiltersAndSort on page component')
      try {
        const keys = Object.keys(pageRef.value)
        console.log('Layout: Available page properties:', keys)
        
        for (const key of keys) {
          const prop = pageRef.value[key]
          if (prop && typeof prop.updateFiltersAndSort === 'function') {
            console.log(`Layout: Found updateFiltersAndSort method on page.${key}`)
            prop.updateFiltersAndSort(params)
            return
          }
        }
      } catch (e) {
        console.error('Layout: Error searching for component method:', e)
      }
    }
  }
}

const handleSearch = (query: string) => {
  console.log('Layout: handleSearch called with query:', query)
  
  // Access the database component directly through the ref
  if (databaseRef.value && databaseRef.value.handleSearch) {
    console.log('Layout: Found database component')
    databaseRef.value.handleSearch(query)
  } else {
    console.log('Layout: Could not find database component')
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
provide('handleToggleNav', handleToggleNav)
provide('handleEdit', handleEdit)
provide('handleShowSignup', handleShowSignup)
provide('showModal', { value: showModal })

// Initialize auth state
onMounted(async () => {
  console.log('Layout: Starting auth initialization...')
  await auth.init()
  isInitialized.value = true
})

// Cleanup on unmount
onUnmounted(() => {
  auth.cleanup()
})
</script>
