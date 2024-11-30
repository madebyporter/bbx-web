<template>
  <main class="grid grid-cols-12 gap-4 min-h-svh">
    <nav id="navbar" class="col-start-1 col-span-2 bg-neutral-100 p-8 flex flex-col gap-16">
      <div>
        <img src="/img/bbx-logo.svg" alt="BBX Logo" class="size-12" />
      </div>
      <div class="flex flex-col gap-4">
        <span class="uppercase text-xs">Resources</span>
        <NuxtLink to="#" class="text-base">Software</NuxtLink>
        <NuxtLink to="#" class="text-base flex flex-row gap-4 items-center text-neutral-400 cursor-not-allowed">
          Sounds & Kits <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="text-base flex flex-row gap-4 items-center whitespace-nowrap text-neutral-400 cursor-not-allowed">
          Sync Libraries <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="text-base flex flex-row gap-4 items-center text-neutral-400 cursor-not-allowed">
          Tutorials <span class="tag">Later</span>
        </NuxtLink>
      </div>
      <div class="flex flex-col gap-4">
        <span class="uppercase text-xs">People</span>
        <NuxtLink to="#" class="text-base flex flex-row gap-4 items-center text-neutral-400 cursor-not-allowed">
          Producers <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="text-base flex flex-row gap-4 items-center text-neutral-400 cursor-not-allowed">
          Engineers <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="text-base flex flex-row gap-4 items-center text-neutral-400 cursor-not-allowed">
          Musicians <span class="tag">Later</span>
        </NuxtLink>
      </div>
      <div class="flex flex-col gap-4">
        <span class="uppercase text-xs">Products</span>
        <NuxtLink to="#" class="text-base flex flex-row gap-4 items-center text-neutral-400 cursor-not-allowed">
          Studio <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="text-base flex flex-row gap-4 items-center text-neutral-400 cursor-not-allowed">
          Display <span class="tag">Later</span>
        </NuxtLink>
      </div>
    </nav>
    <section id="content" class="col-start-3 col-span-10 grid grid-cols-subgrid gap-4 content-start">
      <div class="col-span-full">
        <SearchFilter 
          @open-filter-modal="openFilterModal" 
          @open-modal="showModal = true"
          @search="handleSearch"
        />
      </div>
      <div class="col-span-full">
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
    openFilterModal() {
      console.log('Opening filter modal')
      console.log('Before:', this.showFilterModal)
      this.showFilterModal = true
      console.log('After:', this.showFilterModal)
    },
    closeFilterModal() {
      console.log('Closing filter modal')
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
  }
}
</script>