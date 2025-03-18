<template>
  <main 
    class="grid grid-cols-12 gap-0 min-h-svh transition-all duration-300" 
    :class="{ 'blur-sm': showModal || showFilterModal }"
  >
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
        ">
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
            <!-- <div class="flex justify-center items-center rounded-full overflow-hidden w-8 h-8 min-w-8 min-h-8">
              <img :src="user.user_metadata?.avatar_url || '/img/fpo-avatar.jpg'" :alt="user.user_metadata?.full_name || 'User'" class="w-full h-full" />
            </div> -->
            <div class="flex flex-col gap-0 justify-start items-start">
              <span class="text-sm font-semibold">{{ user.user_metadata?.full_name || user.email }}</span>
              <div class="flex flex-col justify-start items-start gap-1">
                <button @click="handleAuth" class="cursor-pointer text-xs hover:text-neutral-600">Logout</button>
                <button 
                  v-if="isAdmin"
                  @click="showAdminModal = true"
                  class="cursor-pointer text-xs text-amber-300 hover:text-amber-400"
                >
                  Manage Submissions
                </button>
                <!-- <button 
                  @click="toggleDarkMode"
                  class="cursor-pointer text-xs hover:text-neutral-600"
                >
                  {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
                </button> -->
              </div>
            </div>
          </template>
          <template v-else>
            <button @click="handleAuth" class="cursor-pointer text-sm">Login</button>
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
      <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
        <header class="pt-8 pb-4 border-b border-neutral-800">
          <h1 class="text-3xl font-bold indent-1">Music Production Software</h1>
        </header>
        <div class="overflow-x-scroll xl:overflow-auto">
          <Database 
            ref="database" 
            @edit-resource="handleEdit"
            @show-signup="handleShowSignup"
            :can-edit="isAdmin"
          />
        </div>
      </div>
    </section>
    <SubmitResource 
      :key="modalKey"
      :show="showModal" 
      :edit-mode="!!editingResource"
      :resource-to-edit="editingResource"
      @close="closeModal"
      @resource-added="refreshDatabase"
      @resource-updated="refreshDatabase"
    />
    <FilterSort
      :show="showFilterModal"
      @close="showFilterModal = false"
      @apply-filters-and-sort="handleFiltersAndSort"
    />
    <!-- Admin Modal -->
    <AdminResourceManager
      v-if="showAdminModal"
      :show="showAdminModal"
      @close="showAdminModal = false"
      @resource-updated="refreshDatabase"
    />
  </main>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import gsap from 'gsap'
import { handleNetlifyUser } from '~/utils/netlifyIdentityHook'
import { useNuxtApp } from 'nuxt/app'
import { useAuth } from '~/composables/useAuth'

const { $identity } = useNuxtApp()
const { user, init: initAuth } = useAuth()

// Add dark mode state
const isDarkMode = ref(false)

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.classList.toggle('dark', isDarkMode.value)
  localStorage.setItem('darkMode', isDarkMode.value)
}

// Initialize dark mode from saved preference
onMounted(() => {
  const savedDarkMode = localStorage.getItem('darkMode') === 'true'
  isDarkMode.value = savedDarkMode
  document.documentElement.classList.toggle('dark', savedDarkMode)
})

// Initialize auth on mount
onMounted(async () => {
  try {
    console.log('Starting auth initialization...')
    
    // Try initialization a few times with increasing delays
    for (let i = 0; i < 3; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)))
        await initAuth()
        console.log('Auth initialized successfully, user:', user.value)
        break
      } catch (error) {
        console.warn(`Auth initialization attempt ${i + 1} failed:`, error)
        if (i === 2) throw error
      }
    }
  } catch (error) {
    console.error('All auth initialization attempts failed:', error)
  }
})

// Separate handler for "I Use This" signup flow
const handleShowSignup = () => {
  console.log('Show signup called, current user:', user.value)
  if (!user.value) {
    $identity?.open('signup')
  }
}

// Regular auth handler for login/logout button
const handleAuth = () => {
  console.log('Handle auth called, current user:', user.value)
  if (user.value) {
    $identity?.logout()
  } else {
    $identity?.open()
  }
}

const isAdmin = computed(() => {
  if (!user.value) return false
  
  // Check if user has any metadata
  console.log('Full user object:', user.value)
  
  // Check for roles directly in app_metadata.roles
  const roleFromAppMeta = user.value?.app_metadata?.roles?.includes('admin')
  
  console.log('Role check:', {
    user: user.value?.email,
    appMetadata: user.value?.app_metadata,
    roles: user.value?.app_metadata?.roles,
    isAdmin: roleFromAppMeta
  })
  
  return roleFromAppMeta || false
})
</script>

<script>
export default {
  data() {
    return {
      showModal: false,
      showFilterModal: false,
      showAdminModal: false,
      editingResource: null,
      modalKey: 0
    }
  },
  methods: {
    toggleMobileNav() {
      this.showMobileNav = !this.showMobileNav
      
      gsap.to(this.$refs.mobileNav, {
        duration: 0.3,
        x: this.showMobileNav ? 0 : '-105%',
        ease: 'power2.out'
      })
    },
    handleResize() {
      if (window.innerWidth >= 1024) {
        // Reset nav position on desktop
        gsap.set(this.$refs.mobileNav, { x: 0 })
      } else {
        // Reset nav position on mobile
        gsap.set(this.$refs.mobileNav, { x: '-105%' })
      }
      this.showMobileNav = false
    },
    openFilterModal() {
      this.showFilterModal = true
    },
    closeFilterModal() {
      this.showFilterModal = false
    },
    handleEdit(resource) {
      this.editingResource = resource
      this.showModal = true
      this.modalKey++
    },
    closeModal() {
      this.showModal = false
      this.editingResource = null
    },
    refreshDatabase() {
      this.$refs.database.fetchResources()
      this.closeModal()
    },
    handleFiltersAndSort(params) {
      this.$refs.database.updateFiltersAndSort(params)
    },
    handleSearch(query) {
      this.$refs.database.handleSearch(query)
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  }
}
</script>