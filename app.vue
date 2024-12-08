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
        gap-16
        bg-white
        p-8
        top-0
        min-w-[235px]
        max-lg:fixed 
        max-lg:bottom-2 
        max-lg:left-2 
        max-lg:right-2 
        max-lg:top-[150px] 
        max-lg:z-50 
        max-lg:rounded-md 
        max-lg:overflow-scroll 
        max-lg:[transform:translateX(-105%)]
        lg:fixed 
        lg:h-full 
        lg:col-start-1 
        lg:col-span-2 
        lg:overflow-auto  
        lg:bg-neutral-100
        lg:pb-[110px]
        ">
      <div class="sticky top-0">
        <img src="/img/bbx-logo.svg" alt="BBX Logo" class="size-12" />
      </div>
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

      <div class="bg-neutral-200 h-fit fixed bottom-4 left-4 right-4 w-auto rounded-md p-4 flex flex-row items-center max-w-[203px]"> 
        <div v-if="user" class="flex flex-row gap-2 items-center">
          <div class="flex justify-center items-center rounded-full overflow-hidden w-8 h-8 min-w-8 min-h-8">
            <img :src="user.user_metadata?.avatar_url || '/img/fpo-avatar.jpg'" :alt="user.user_metadata?.full_name || user.email" class="w-full h-full" />
          </div>
          <div class="flex flex-col gap-0 justify-start items-start">
            <span class="text-sm font-semibold">{{ user.user_metadata?.full_name || user.email }}</span>
            <button @click="logout" class="cursor-pointer text-xs">Logout</button>
          </div>
        </div>
        <button v-else @click="login" class="text-sm cursor-pointer">Login</button>
      </div>
    </nav>
    <section id="content" class="col-start-1 col-span-12 lg:col-start-3 lg:col-span-10 grid grid-cols-subgrid gap-4 content-start">
      <div class="col-span-full sticky top-0 z-50">
        <SearchFilter 
          @open-filter-modal="openFilterModal" 
          @open-modal="showModal = true"
          @search="handleSearch"
          @toggle-nav="toggleMobileNav"
        />
      </div>
      <div class="col-span-full max-w-full lg:max-w-none overflow-x-scroll lg:overflow-visible p-2 lg:p-0">
        <Database 
          ref="database" 
          @edit-resource="handleEdit"
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
    <!-- Admin button (only for admin users) -->
    <button 
      v-if="isAdmin"
      @click="showAdminModal = true"
      class="fixed bottom-20 right-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
    >
      Manage Submissions
    </button>

    <!-- Admin Modal -->
    <AdminResourceManager
      v-if="showAdminModal"
      :show="showAdminModal"
      @close="showAdminModal = false"
      @resource-updated="refreshDatabase"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import type { Resource } from '~/types/resource'
import gsap from 'gsap'
import AdminResourceManager from '~/components/AdminResourceManager.vue'

const { init, user, login, logout, isAdmin } = useAuth()
const showMobileNav = ref(false)
const showModal = ref(false)
const showFilterModal = ref(false)
const editingResource = ref<Resource | null>(null)
const modalKey = ref(0)
const mobileNav = ref(null)
const showAdminModal = ref(false)

onMounted(() => {
  init()
  handleResize()
  window.addEventListener('resize', handleResize)
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

const openFilterModal = () => {
  showFilterModal.value = true
}

const closeFilterModal = () => {
  showFilterModal.value = false
}

const handleEdit = (resource: any) => {
  editingResource.value = resource
  showModal.value = true
  modalKey.value++
}

const closeModal = () => {
  showModal.value = false
  editingResource.value = null
}

const refreshDatabase = () => {
  // @ts-ignore
  database.value?.fetchResources()
  closeModal()
}

const handleFiltersAndSort = (params: any) => {
  // @ts-ignore
  database.value?.updateFiltersAndSort(params)
}

const handleSearch = (query: string) => {
  // @ts-ignore
  database.value?.handleSearch(query)
}
</script>