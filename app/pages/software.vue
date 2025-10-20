<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
    <LibraryHeader 
      title="Music production software" 
      :count="resourceCount"
      item-label="item"
    />
    <Database 
      ref="database" 
      type="software"
      @edit-resource="$emit('edit-resource', $event)"
      @show-signup="$emit('show-signup')"
      :can-edit="isAdmin"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import Database from '~/components/Database.vue'
import LibraryHeader from '~/components/LibraryHeader.vue'

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
const database = ref<InstanceType<typeof Database> | null>(null)

// Computed property for resource count
const resourceCount = computed(() => {
  return database.value?.resources?.length || 0
})

// Inject search handler registration functions from layout
const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')

defineEmits(['edit-resource', 'show-signup'])

// Search handler that forwards to database component
const handleSearch = (query: string) => {
  database.value?.handleSearch(query)
}

// Register search handler on mount
onMounted(() => {
  if (registerSearchHandler) {
    registerSearchHandler(handleSearch)
  }
})

// Unregister on unmount
onUnmounted(() => {
  if (unregisterSearchHandler) {
    unregisterSearchHandler()
  }
})

// Expose the database ref to parent
defineExpose({
  database,
  handleSearch,
  updateFiltersAndSort: (params: FilterSortParams) => {
    console.log('Software page: Forwarding updateFiltersAndSort to database component')
    if (database.value && typeof database.value.updateFiltersAndSort === 'function') {
      database.value.updateFiltersAndSort(params)
    } else {
      console.error('Software page: Database component not found or updateFiltersAndSort method not available')
    }
  },
  fetchResources: () => {
    console.log('Software page: Forwarding fetchResources to database component')
    if (database.value && typeof database.value.fetchResources === 'function') {
      return database.value.fetchResources()
    } else {
      console.error('Software page: Database component not found or fetchResources method not available')
    }
  }
})
</script>