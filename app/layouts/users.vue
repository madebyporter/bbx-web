<template>
  <NuxtLayout name="default">
    <section id="content"
      class="col-start-1 col-span-12 lg:col-start-4 lg:col-span-9 xl:col-start-3 xl:col-span-10 grid grid-cols-subgrid gap-0 content-start lg:pl-4">
      <div class="col-span-full sticky top-0 z-50">
        <SearchFilter @open-filter-modal="openFilterModal" @open-modal="showModal = true" @search="handleSearch"
          @toggle-nav="handleToggleNav" />
      </div>
      <slot @edit-resource="handleEdit" @show-signup="handleShowSignup" />
    </section>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { inject } from 'vue'

// Define interfaces for type safety
interface Resource {
  id: number
  name: string
  creator: string
  price: string
  link: string
  image_url: string | null
  os: string[]
  tags: string[]
  type: any
}

// Inject functions from parent layout
const openFilterModal = inject('openFilterModal') as () => void
const handleSearch = inject('handleSearch') as (query: string) => void
const handleToggleNav = inject('handleToggleNav') as () => void
const handleEdit = inject('handleEdit') as (resource: Resource) => void
const handleShowSignup = inject('handleShowSignup') as () => void
const showModal = inject('showModal') as { value: boolean }

const handleModalToggle = () => {
  if (showModal) {
    showModal.value = !showModal.value
  }
}
</script>
