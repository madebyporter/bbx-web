<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <header class="pt-8 pb-4 border-b border-neutral-800">
      <h1 class="text-3xl font-bold indent-1">Music production sounds</h1>
    </header>
    <div class="overflow-x-scroll xl:overflow-auto">
      <DatabaseGrid 
        ref="databaseGrid" 
        type="sounds"
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
import DatabaseGrid from '~/components/DatabaseGrid.vue'

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
  name: 'sounds'
})

const { isAdmin } = useAuth()
const databaseGrid = ref<InstanceType<typeof DatabaseGrid> | null>(null)

defineEmits(['edit-resource', 'show-signup'])

// Expose the database ref to parent
defineExpose({
  databaseGrid,
  handleSearch: (query: string) => databaseGrid.value?.handleSearch(query),
  updateFiltersAndSort: (params: FilterSortParams) => {
    console.log('Sounds page: Forwarding updateFiltersAndSort to databaseGrid component')
    if (databaseGrid.value && typeof databaseGrid.value.updateFiltersAndSort === 'function') {
      databaseGrid.value.updateFiltersAndSort(params)
    } else {
      console.error('Sounds page: DatabaseGrid component not found or updateFiltersAndSort method not available')
    }
  }
})
</script> 