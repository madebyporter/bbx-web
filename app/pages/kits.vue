<template>
  <!-- Only show list content when on /kits exactly, not on child routes -->
  <div v-if="route.path === '/kits'" class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
    <LibraryHeader 
      title="Music production kits" 
      :count="resourceCount"
      item-label="kit"
      filter-context="kits"
      @open-filter-sort="handleOpenFilterSort"
    />
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
  <!-- Render child routes (detail pages) -->
  <NuxtPage v-else />
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import DatabaseGrid from '~/components/DatabaseGrid.vue'
import LibraryHeader from '~/components/LibraryHeader.vue'

const route = useRoute()

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

// Computed property for resource count
const resourceCount = computed(() => {
  return databaseGrid.value?.resources?.length || 0
})

// Inject context items registration functions from layout
const registerContextItems = inject<(items: any[], fields: string[]) => void>('registerContextItems')
const unregisterContextItems = inject<() => void>('unregisterContextItems')
const openFilterModal = inject<() => void>('openFilterModal')

defineEmits(['edit-resource', 'show-signup'])

// Handle open filter/sort from LibraryHeader
const handleOpenFilterSort = () => {
  if (openFilterModal) {
    openFilterModal()
  }
}

// Watch resources to update context items for search
watch(() => databaseGrid.value?.resources, (resources) => {
  if (registerContextItems && resources && resources.length > 0) {
    // For kits, search by name, creator, tags
    registerContextItems(resources, ['name', 'creator', 'tags'])
  }
}, { immediate: true, deep: true })

// Register context items on mount
onMounted(() => {
  // Register initial context items
  if (registerContextItems && databaseGrid.value?.resources) {
    registerContextItems(databaseGrid.value.resources, ['name', 'creator', 'tags'])
  }
})

// Unregister on unmount
onUnmounted(() => {
  if (unregisterContextItems) {
    unregisterContextItems()
  }
})

// Expose the database ref to parent
defineExpose({
  databaseGrid,
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

