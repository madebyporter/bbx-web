<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <header class="px-2 pt-8 pb-4 border-b border-neutral-800">
      <h1 class="text-xl lg:text-3xl font-bold indent-1">Music production kits</h1>
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
import { ref, inject, onMounted, onUnmounted } from 'vue'
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

const { isAdmin } = useAuth()
const databaseGrid = ref<InstanceType<typeof DatabaseGrid> | null>(null)

// Inject search handler registration functions from layout
const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')

defineEmits(['edit-resource', 'show-signup'])

// Search handler that forwards to databaseGrid component
const handleSearch = (query: string) => {
  console.log('Kits page: handleSearch called with:', query, 'databaseGrid ref:', databaseGrid.value)
  if (databaseGrid.value?.handleSearch) {
    console.log('Kits page: Calling databaseGrid.handleSearch')
    databaseGrid.value.handleSearch(query)
  } else {
    console.log('Kits page: databaseGrid.handleSearch not available')
  }
}

// Register search handler on mount
onMounted(() => {
  console.log('Kits page: onMounted, databaseGrid ref:', databaseGrid.value)
  if (registerSearchHandler) {
    console.log('Kits page: Registering search handler')
    registerSearchHandler(handleSearch)
  } else {
    console.log('Kits page: registerSearchHandler not available')
  }
})

// Unregister on unmount
onUnmounted(() => {
  console.log('Kits page: onUnmounted, unregistering handler')
  if (unregisterSearchHandler) {
    unregisterSearchHandler()
  }
})

// Expose the database ref to parent
defineExpose({
  databaseGrid,
  handleSearch,
  updateFiltersAndSort: (params: FilterSortParams) => {
    console.log('Kits page: Forwarding updateFiltersAndSort to databaseGrid component')
    if (databaseGrid.value && typeof databaseGrid.value.updateFiltersAndSort === 'function') {
      databaseGrid.value.updateFiltersAndSort(params)
    } else {
      console.error('Kits page: DatabaseGrid component not found or updateFiltersAndSort method not available')
    }
  },
  fetchResources: () => {
    console.log('Kits page: Forwarding fetchResources to databaseGrid component')
    if (databaseGrid.value && typeof databaseGrid.value.fetchResources === 'function') {
      return databaseGrid.value.fetchResources()
    } else {
      console.error('Kits page: DatabaseGrid component not found or fetchResources method not available')
    }
  }
})
</script>

