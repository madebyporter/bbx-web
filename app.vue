<template>
  <main class="grid grid-cols-12 gap-4 min-h-svh">
    <nav id="navbar" class="col-start-1 col-span-2 bg-neutral-100"></nav>
    <section id="content" class="col-start-3 col-span-10 grid grid-cols-subgrid gap-4 content-start">
      <div class="col-span-full">
        <SearchFilter 
          @open-filter-modal="openFilterModal" 
          @open-modal="showModal = true" 
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
    }
  }
}
</script>