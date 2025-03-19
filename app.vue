<template>
  <div v-if="isInitialized">
    <main class="grid grid-cols-12 gap-0 min-h-svh transition-all duration-300" :class="{ 'blur-sm': showAuthModal || showAdminModal }">
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
            <NuxtLink to="#" class="nav-link">Software</NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Hardware <span class="tag">Later</span>
            </NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Sounds & Kits <span class="tag">Later</span>
            </NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Sync Libraries <span class="tag">Later</span>
            </NuxtLink>
            <NuxtLink to="#" class="nav-link-later">
              Tutorials <span class="tag">Later</span>
            </NuxtLink>
          </div>
          <div class="flex flex-col gap-4">
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
          </div>
        </div>

        <!-- Account UI -->
        <div class="bg-neutral-900 ring-1 ring-neutral-800 text-neutral-200 h-fit absolute bottom-4 left-4 right-4 w-auto rounded-md !p-4 hidden lg:flex flex-row items-center max-w-[203px]"> 
          <div class="flex flex-row gap-2 items-center">
            <template v-if="user">
              <div class="flex flex-col gap-0 justify-start items-start">
                <span class="text-sm font-semibold">{{ user.email }}</span>
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
          @edit-resource="handleEdit"
          @show-signup="handleShowSignup"
        />
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

    <!-- Admin Modal -->
    <AdminModal 
      v-if="showAdminModal" 
      @close="showAdminModal = false"
      :canEdit="isAdmin"
    />

    <!-- Resource Modal -->
    <SubmitResource 
      :key="modalKey"
      :show="showModal" 
      :edit-mode="!!editingResource"
      :resource-to-edit="editingResource"
      @close="closeModal"
      @resource-added="refreshDatabase"
      @resource-updated="refreshDatabase"
    />

    <!-- Filter Modal -->
    <FilterSort
      :show="showFilterModal"
      @close="showFilterModal = false"
      @apply-filters-and-sort="handleFiltersAndSort"
    />
  </div>
  <div v-else class="flex items-center justify-center min-h-screen">
    <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { useAuth } from '~/composables/useAuth'

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
const showFilterModal = ref(false)
const editingResource = ref(null)
const modalKey = ref(0)
const showMobileNav = ref(false)

// Navigation
const mobileNav = ref(null)

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
  } catch (error) {
    console.error('Auth error:', error)
    alert(error.message)
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
  showFilterModal.value = true
}

const handleEdit = (resource) => {
  editingResource.value = resource
  showModal.value = true
  modalKey.value++
}

const closeModal = () => {
  showModal.value = false
  editingResource.value = null
}

const refreshDatabase = () => {
  // Emit event to refresh database
  closeModal()
}

const handleFiltersAndSort = (params) => {
  // Handle filter and sort updates
}

const handleSearch = (query) => {
  // Handle search
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
  console.log('App: Auth initialized successfully, user:', user.value)
})

// Cleanup on unmount
onUnmounted(() => {
  auth.cleanup()
  window.removeEventListener('resize', handleResize)
})
</script>