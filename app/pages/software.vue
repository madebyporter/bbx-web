<template>
  <!-- Only show list content when on /software exactly, not on child routes -->
  <div v-if="route.path === '/software'" class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
    <LibraryHeader 
      title="Music production software" 
      :count="resourceCount"
      item-label="item"
      filter-context="software"
      @open-filter-sort="handleOpenFilterSort"
    />
    <Database 
      ref="database" 
      type="software"
      @show-signup="$emit('show-signup')"
    />
  </div>
  <!-- Render child routes (detail pages) -->
  <NuxtPage v-else />
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import Database from '~/components/Database.vue'
import LibraryHeader from '~/components/LibraryHeader.vue'

// Define page meta to ensure this only matches /software exactly
definePageMeta({
  key: 'software-list'
})

const route = useRoute()

// Debug logging
console.log('[software.vue] Component mounted/updated', {
  path: route.path,
  params: route.params,
  fullPath: route.fullPath
})

// Watch for route changes
watch(() => route.path, (newPath, oldPath) => {
  console.log('[software.vue] Route path changed', {
    from: oldPath,
    to: newPath,
    params: route.params
  })
  
  // If navigating to a detail page, this component should unmount
  // If we're still here, Nuxt isn't recognizing the route change
  if (newPath !== '/software' && newPath.startsWith('/software/')) {
    console.warn('[software.vue] WARNING: Still mounted when navigating to detail page!', {
      currentPath: newPath,
      expected: 'Should unmount and mount software/[slug].vue'
    })
  }
}, { immediate: true })

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
watch(() => database.value?.resources, (resources) => {
  if (registerContextItems && resources && resources.length > 0) {
    // For software, search by name, creator, tags
    // Note: type is an object, so we'll search name and creator primarily, tags as array
    registerContextItems(resources, ['name', 'creator', 'tags'])
  }
}, { immediate: true, deep: true })

// Register context items on mount
onMounted(() => {
  // Register initial context items
  if (registerContextItems && database.value?.resources) {
    registerContextItems(database.value.resources, ['name', 'creator', 'tags'])
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
  database,
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