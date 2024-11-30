<template>
  <main class="grid grid-cols-12 gap-4 min-h-svh">
    <nav id="navbar" class="col-start-1 col-span-2 bg-neutral-100"></nav>
    <section id="content" class="col-start-3 col-span-10 grid grid-cols-subgrid gap-4 content-start">
      <div class="col-span-full">
        <SearchFilter @open-modal="showModal = true"></SearchFilter>
      </div>
      <div class="col-span-full">
        <Database 
          ref="database" 
          @edit-resource="handleEdit"
        ></Database>
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
  </main>
</template>

<script>
export default {
  data() {
    return {
      showModal: false,
      editingResource: null,
      modalKey: 0
    }
  },
  methods: {
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
    }
  }
}
</script>