<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <header class="px-2 pt-8 pb-4 border-b border-neutral-800">
      <h1 class="text-xl lg:text-3xl font-bold indent-1">Music production software</h1>
    </header>
    <div class="overflow-x-scroll xl:overflow-auto">
      <Database 
        ref="database" 
        type="software"
        @edit-resource="$emit('edit-resource', $event)"
        @show-signup="$emit('show-signup')"
        :can-edit="isAdmin"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import Database from '~/components/Database.vue'

// Define interfaces for type safety
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

definePageMeta({
  name: 'sounds',
  layout: 'resources'
})

const { isAdmin } = useAuth()
const database = ref<InstanceType<typeof Database> | null>(null)

defineEmits(['edit-resource', 'show-signup'])

// Expose the database ref to parent
defineExpose({
  database,
  handleSearch: (query: string) => database.value?.handleSearch(query),
  updateFiltersAndSort: (params: FilterSortParams) => {
    console.log('Index page: Forwarding updateFiltersAndSort to database component')
    if (database.value && typeof database.value.updateFiltersAndSort === 'function') {
      database.value.updateFiltersAndSort(params)
    } else {
      console.error('Index page: Database component not found or updateFiltersAndSort method not available')
    }
  },
  fetchResources: () => {
    console.log('Index page: Forwarding fetchResources to database component')
    if (database.value && typeof database.value.fetchResources === 'function') {
      return database.value.fetchResources()
    } else {
      console.error('Index page: Database component not found or fetchResources method not available')
    }
  }
})
</script> 