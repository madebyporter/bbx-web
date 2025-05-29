<template>
  <div v-if="isInitialized">
    <main class="grid grid-cols-12 gap-0 min-h-svh transition-all duration-300">
      <nav 
        ref="mobileNav"
        id="navbar" 
        class="
          flex 
          flex-col
          gap-4
          border 
          border-neutral-800
          bg-neutral-900
          *:p-8
          min-w-[235px]
          max-lg:fixed 
          max-lg:bottom-2 
          max-lg:left-2 
          max-lg:right-2 
          max-lg:top-[144px] 
          max-lg:z-50 
          max-lg:rounded-md 
          max-lg:[transform:translateX(-105%)]
          lg:col-start-1 
          lg:col-span-3 
          lg:fixed 
          lg:top-2
          lg:left-2
          lg:bottom-2
          lg:rounded-md
          xl:col-start-1 
          xl:col-span-2 
          "
      >
        <div class="sticky top-0">
          <img src="/img/bbx-logo.svg" alt="BBX Logo" class="size-12" />
        </div>
        <div class="flex flex-col gap-16 grow overflow-auto lg:pb-[130px]">
          <div class="flex flex-col gap-4">
            <span class="nav-header">Resources</span>
            <NuxtLink to="/" class="nav-link" active-class="!font-bold !text-white">Software</NuxtLink>
            <NuxtLink to="/sounds" class="nav-link" active-class="!font-bold !text-white">Sounds & Kits</NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Hardware <span class="tag">Later</span>
            </NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Sync Libraries <span class="tag">Later</span>
            </NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Events <span class="tag">Later</span>
            </NuxtLink>
          </div>
          <!-- <div class="flex flex-col gap-4">
            <span class="nav-header">People</span>
            <NuxtLink to="#" class="nav-link-later">
              Producers <span class="tag">Later</span>
            </NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Engineers <span class="tag">Later</span>
            </NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Musicians <span class="tag">Later</span>
            </NuxtLink>
          </div>
          <div class="flex flex-col gap-4">
            <span class="nav-header">Products</span>
            <NuxtLink to="#" class="nav-link-later">
              Studio <span class="tag">Later</span>
            </NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Display <span class="tag">Later</span>
            </NuxtLink>
          </div> -->
        </div>

        <!-- Account UI -->
        <div class="bg-neutral-900 ring-1 ring-neutral-800 text-neutral-200 h-fit absolute bottom-4 left-4 right-4 rounded-md !p-4 hidden lg:flex flex-row items-center overflow-hidden"> 
          <div class="flex flex-row gap-2 items-center w-full">
            <template v-if="user">
              <div class="flex flex-col gap-0 justify-start items-start w-full overflow-hidden text-ellipsis">
                <span class="block text-sm font-semibold w-full">{{ user.email }}</span>
                <div class="flex flex-col justify-start items-start gap-1">
                  <button @click="handleAuth" class="cursor-pointer text-xs hover:text-neutral-600">Logout</button>
                  <button 
                    v-if="isAdmin"
                    @click="showAdminModal = true"
                    class="cursor-pointer text-xs text-amber-300 hover:text-amber-400"
                  >
                    Manage Submissions
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <button @click="showAuthModal = true" class="cursor-pointer text-sm">Login</button>
            </template>
          </div>
        </div>
      </nav>

      <section id="content" class="col-start-1 col-span-12 lg:col-start-4 lg:col-span-9 xl:col-start-3 xl:col-span-10 grid grid-cols-subgrid gap-0 content-start lg:pl-4">
        <div class="col-span-full sticky top-0 z-50">
          <SearchFilter 
            @open-filter-modal="openFilterModal" 
            @open-modal="showModal = true"
            @search="handleSearch"
            @toggle-nav="toggleMobileNav"
          />
        </div>
        <NuxtPage 
          ref="pageRef"
          @edit-resource="handleEdit"
          @show-signup="handleShowSignup"
        >
          <template #default="{ Component }">
            <Suspense>
              <component 
                :is="Component"
                ref="databaseRef"
                :can-edit="isAdmin"
                @update-filters="handleFiltersAndSort"
              />
            </Suspense>
          </template>
        </NuxtPage>
      </section>
    </main>

    <!-- Auth Modal -->
    <div 
      v-if="showAuthModal" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showAuthModal = false"
    >
      <div class="bg-neutral-900 ring-1 ring-neutral-800 text-neutral-200 p-6 rounded-lg w-96 relative">
        <button 
          @click="showAuthModal = false"
          class="absolute top-4 right-4 text-neutral-400 hover:text-neutral-300"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.75 17.25L12 12L17.25 17.25M17.25 6.75L12 12L6.75 6.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h2 class="text-xl font-bold mb-4">{{ isSignUp ? 'Sign Up' : 'Sign In' }}</h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <input 
              v-model="email" 
              type="email" 
              required
              class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Password</label>
            <input 
              v-model="password" 
              type="password" 
              required
              class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div class="flex justify-between items-center">
            <button 
              type="submit" 
              class="bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-600 transition-colors"
            >
              {{ isSignUp ? 'Sign Up' : 'Sign In' }}
            </button>
            <button 
              type="button"
              @click="toggleAuthMode"
              class="text-sm text-neutral-400 hover:text-neutral-300"
            >
              {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Manage Submissions Drawer -->
    <ManageSubmissions 
      v-model:show="showAdminModal"
      :canEdit="isAdmin"
    />

    <!-- Resource Modal -->
    <SubmitResource 
      :key="modalKey"
      v-model:show="showModal"
      :edit-mode="!!editingResource"
      :resource-to-edit="editingResource"
      @close="closeModal"
      @resource-added="refreshDatabase"
      @resource-updated="refreshDatabase"
    />

    <!-- Filter Modal -->
    <FilterSort
      v-model:show="showFilterSort"
      :initial-sort="currentSort"
      :initial-filters="currentFilters"
      @apply-filters="handleFiltersAndSort"
    />
  </div>
  <div v-else class="flex items-center justify-center min-h-screen">
    <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
const showMobileNav = ref(false)
const pageRef = ref<PageRef | null>(null)
const databaseRef = ref<DatabaseRef | null>(null)

// Navigation
const mobileNav = ref(null)

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

const toggleMobileNav = () => {
  showMobileNav.value = !showMobileNav.value
  
  gsap.to(mobileNav.value, {
    duration: 0.3,
    x: showMobileNav.value ? 0 : '-105%',
    ease: 'power2.out'
  })
}

const handleResize = () => {
  if (window.innerWidth >= 1024) {
    // Reset nav position on desktop
    gsap.set(mobileNav.value, { x: 0 })
  } else {
    // Reset nav position on mobile
    gsap.set(mobileNav.value, { x: '-105%' })
  }
  showMobileNav.value = false
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

const handleAuth = async () => {
  if (user.value) {
    await auth.signOut()
  } else {
    showAuthModal.value = true
  }
}

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
  // Just refresh the database, don't close the modal
  if (databaseRef.value?.fetchResources) {
    console.log('App: Found database component, calling fetchResources')
    databaseRef.value.fetchResources()
  } else {
    console.error('App: Database component not found or fetchResources method not available')
  }
}

const handleFiltersAndSort = (params: FilterSortParams) => {
  console.log('App: Received filter params:', params)
  
  if (!params) {
    console.error('App: Invalid filter parameters received')
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
  
  console.log('App: Updated filters to:', {
    price: currentFilters.value.price,
    os: currentFilters.value.os,
    tags: currentFilters.value.tags
  })
  
  // Get database component reference - try different approaches to find it
  // First try direct reference
  let dbComponent = databaseRef.value
  
  // If direct ref doesn't work, try to get it through the page ref
  if (!dbComponent && pageRef.value) {
    console.log('App: Trying to find database component through page ref')
    
    try {
      // Check if page has exposed database property
      if (pageRef.value.database && pageRef.value.database.value) {
        dbComponent = pageRef.value.database.value
        console.log('App: Found database component through page database property')
      } 
      // If no database property, check if page has databaseGrid property
      else if (pageRef.value.databaseGrid && pageRef.value.databaseGrid.value) {
        dbComponent = pageRef.value.databaseGrid.value
        console.log('App: Found database component through page databaseGrid property')
      }
      // Check if page is directly exposing component methods
      else if (typeof pageRef.value.updateFiltersAndSort === 'function') {
        console.log('App: Using page component methods directly')
        pageRef.value.updateFiltersAndSort(params)
        return
      }
    } catch (e) {
      console.error('App: Error accessing page component:', e)
    }
  }
  
  // Attempt to update filters
  if (dbComponent && typeof dbComponent.updateFiltersAndSort === 'function') {
    console.log('App: Database component found, updating filters')
    try {
      dbComponent.updateFiltersAndSort({
        sort: currentSort.value,
        filters: currentFilters.value
      })
    } catch (error) {
      console.error('App: Error applying filters:', error)
    }
  } else {
    console.error('App: Database component not found or updateFiltersAndSort method not available!')
    
    // Last resort - try to find any component with updateFiltersAndSort method
    if (pageRef.value) {
      console.log('App: Attempting to find updateFiltersAndSort on page component')
      try {
        const keys = Object.keys(pageRef.value)
        console.log('App: Available page properties:', keys)
        
        for (const key of keys) {
          const prop = pageRef.value[key]
          if (prop && typeof prop.updateFiltersAndSort === 'function') {
            console.log(`App: Found updateFiltersAndSort method on page.${key}`)
            prop.updateFiltersAndSort(params)
            return
          }
        }
      } catch (e) {
        console.error('App: Error searching for component method:', e)
      }
    }
  }
}

const handleSearch = (query: string) => {
  console.log('App: handleSearch called with query:', query)
  
  // Access the database component directly through the ref
  if (databaseRef.value) {
    console.log('App: Found database component')
    databaseRef.value.handleSearch(query)
  } else {
    console.log('App: Could not find database component')
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

// Initialize auth state
onMounted(async () => {
  console.log('App: Starting auth initialization...')
  await auth.init()
  isInitialized.value = true
})

// Cleanup on unmount
onUnmounted(() => {
  auth.cleanup()
  window.removeEventListener('resize', handleResize)
})
</script>