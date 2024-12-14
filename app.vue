<template>
  <main 
    class="grid grid-cols-12 gap-4 min-h-svh transition-all duration-300" 
    :class="{ 'blur-sm': showModal || showFilterModal }"
  >
    <nav 
      ref="mobileNav"
      id="navbar" 
      class="
        flex 
        flex-col
        gap-4
        bg-white
        *:p-8
        top-0
        min-w-[235px]
        max-lg:fixed 
        max-lg:bottom-2 
        max-lg:left-2 
        max-lg:right-2 
        max-lg:top-[150px] 
        max-lg:z-50 
        max-lg:rounded-md 
        max-lg:[transform:translateX(-105%)]
        lg:col-start-1 
        lg:col-span-3 
        lg:fixed 
        lg:h-full 
        lg:bg-neutral-100
        xl:col-start-1 
        xl:col-span-2 
        ">
      <div class="sticky top-0">
        <img src="/img/bbx-logo.svg" alt="BBX Logo" class="size-12" />
      </div>
      <div class="flex flex-col gap-16 grow overflow-auto lg:pb-[130px]">
        <div class="flex flex-col gap-4">
          <span class="uppercase text-xs">Resources</span>
          <NuxtLink to="#" class="text-base">Software</NuxtLink>
          <NuxtLink to="#" class="nav-text-later">
            Hardware <span class="tag">Later</span>
          </NuxtLink>
          <NuxtLink to="#" class="nav-text-later">
            Sounds & Kits <span class="tag">Later</span>
          </NuxtLink>
          <NuxtLink to="#" class="nav-text-later">
            Sync Libraries <span class="tag">Later</span>
          </NuxtLink>
          <NuxtLink to="#" class="nav-text-later">
            Tutorials <span class="tag">Later</span>
          </NuxtLink>
        </div>
        <div class="flex flex-col gap-4">
          <span class="uppercase text-xs">People</span>
          <NuxtLink to="#" class="nav-text-later">
            Producers <span class="tag">Later</span>
          </NuxtLink>
          <NuxtLink to="#" class="nav-text-later">
            Engineers <span class="tag">Later</span>
          </NuxtLink>
          <NuxtLink to="#" class="nav-text-later">
            Musicians <span class="tag">Later</span>
          </NuxtLink>
        </div>
        <div class="flex flex-col gap-4">
          <span class="uppercase text-xs">Products</span>
          <NuxtLink to="#" class="nav-text-later">
            Studio <span class="tag">Later</span>
          </NuxtLink>
          <NuxtLink to="#" class="nav-text-later">
            Display <span class="tag">Later</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Account UI -->
      <div class="bg-neutral-200 h-fit fixed bottom-4 left-4 right-4 w-auto rounded-md !p-4 hidden lg:flex flex-row items-center max-w-[203px]"> 
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
                  class="cursor-pointer text-xs text-purple-600 hover:text-purple-700"
                >
                  Manage Submissions
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <button @click="handleAuth" class="cursor-pointer text-sm">Login</button>
          </template>
        </div>
      </div>
    </nav>
    <section id="content" class="col-start-1 col-span-12 lg:col-start-4 lg:col-span-9 xl:col-start-3 xl:col-span-10 grid grid-cols-subgrid gap-4 content-start">
      <div class="col-span-full sticky top-0 z-50">
        <SearchFilter 
          @open-filter-modal="openFilterModal" 
          @open-modal="showModal = true"
          @search="handleSearch"
          @toggle-nav="toggleMobileNav"
        />
      </div>
      <div class="col-span-full max-w-full lg:max-w-none overflow-x-scroll xl:overflow-visible p-2 lg:p-0 flex flex-col gap-8">
        <header class="pt-8 pb-4 border-b border-neutral-200">
          <h1 class="text-3xl font-bold indent-1">Music Production Software</h1>
        </header>
        <Database 
          ref="database" 
          @edit-resource="handleEdit"
          :can-edit="isAdmin"
        />
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

// Initialize netlify identity
const user = ref(null)
const { $identity } = useNuxtApp()

// Watch for user changes
watch(() => user.value, (newUser) => {
  console.log('User state changed:', newUser)
  if (newUser) {
    console.log('User roles:', newUser.app_metadata?.roles)
  }
}, { deep: true })

onMounted(() => {
  // Set initial user state and force a metadata refresh
  const currentUser = $identity.currentUser()
  if (currentUser) {
    // Store the full user object
    user.value = {
      ...currentUser,
      // Ensure we have the metadata
      app_metadata: currentUser.app_metadata || {},
      user_metadata: currentUser.user_metadata || {}
    }
    console.log('Mounted with user:', user.value)
  }

  // Listen for login events with full metadata
  $identity.on('login', (loginUser) => {
    if (loginUser) {
      user.value = {
        ...loginUser,
        app_metadata: loginUser.app_metadata || {},
        user_metadata: loginUser.user_metadata || {}
      }
      console.log('Login with user:', user.value)
    }
    $identity.close()
  })

  $identity.on('logout', () => {
    user.value = null
    console.log('Logged out')
  })
})

// Handle login/logout
const handleAuth = () => {
  if (user.value) {
    $identity.logout()
  } else {
    $identity.open()
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