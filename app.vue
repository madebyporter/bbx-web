<template>
  <main 
    class="grid grid-cols-12 gap-4 min-h-svh transition-all duration-300 overflow-x-hidden" 
    :class="{ 'blur-sm': showModal || showFilterModal }"
  >
    <nav 
      ref="mobileNav"
      id="navbar" 
      class="flex max-lg:fixed max-lg:bottom-2 max-lg:left-2 max-lg:right-2 max-lg:top-[150px] max-lg:z-50 max-lg:rounded-md max-lg:overflow-scroll lg:fixed lg:h-full lg:col-start-1 lg:col-span-2 lg:overflow-hidden bg-white lg:bg-neutral-100 p-8 flex-col gap-16 max-lg:[transform:translateX(-105%)] top-0"
    >
      <div>
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
    </nav>
    <section id="content" class="col-start-1 col-span-12 lg:col-start-3 lg:col-span-10 grid grid-cols-subgrid gap-4 content-start">
      <div class="col-span-full sticky top-0 z-50 lg:static lg:top-auto">
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
  </main>
</template>

<script>
import gsap from 'gsap'

export default {
  data() {
    return {
      showModal: false,
      showFilterModal: false,
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