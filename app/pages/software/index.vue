<template>
  <!-- Only show list content when on /software exactly, not on child routes -->
  <div v-if="route.path === '/software'" class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
    <LibraryHeader 
      title="Music production software" 
      :count="resourceCount"
      item-label="item"
      filter-context="software"
      :show-clear-filters="hasActiveFilterSort"
      @open-filter-sort="handleOpenFilterSort"
      @clear-filters="handleClearFilterSort"
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
import { ref, inject, onMounted, onUnmounted, computed, watch, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import type { FilterSortParams } from '~/composables/useFilterSortPersistence'
import Database from '~/components/Database.vue'
import LibraryHeader from '~/components/LibraryHeader.vue'

// Define page meta to ensure this only matches /software exactly
definePageMeta({
  key: 'software-list'
})

const route = useRoute()

// SSR SEO metadata for the software list page
const siteOrigin = useSiteOrigin()
const softwareCanonical = `${siteOrigin}/software`
const softwareSeoTitle = 'Music Production Software'
const softwareSeoDescription = 'Browse a curated collection of music production software — DAWs, synths, samplers, plugins, and audio tools used by producers and engineers.'

useSeoMeta({
  title: softwareSeoTitle,
  description: softwareSeoDescription,
  ogTitle: `${softwareSeoTitle} | Beatbox`,
  ogDescription: softwareSeoDescription,
  ogUrl: softwareCanonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: `${softwareSeoTitle} | Beatbox`,
  twitterDescription: softwareSeoDescription,
})

useHead({
  link: [
    { rel: 'canonical', href: softwareCanonical, key: 'canonical' }
  ]
})

// Debug logging

// Watch for route changes
watch(() => route.path, (newPath, oldPath) => {
  
  // If navigating to a detail page, this component should unmount
  // If we're still here, Nuxt isn't recognizing the route change
  if (newPath !== '/software' && newPath.startsWith('/software/')) {
    console.warn('[software.vue] WARNING: Still mounted when navigating to detail page!', {
      currentPath: newPath,
      expected: 'Should unmount and mount software/[slug].vue'
    })
  }
}, { immediate: true })

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
const clearFilterSort = inject<(() => void) | null>('clearFilterSort', null)
const hasActiveFilterSort = inject<ComputedRef<boolean>>('hasActiveFilterSort', computed(() => false))

defineEmits(['edit-resource', 'show-signup'])

// Handle open filter/sort from LibraryHeader
const handleOpenFilterSort = () => {
  if (openFilterModal) {
    openFilterModal()
  }
}

const handleClearFilterSort = () => {
  clearFilterSort?.()
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
    if (database.value && typeof database.value.updateFiltersAndSort === 'function') {
      database.value.updateFiltersAndSort(params)
    } else {
      console.error('Software page: Database component not found or updateFiltersAndSort method not available')
    }
  },
  fetchResources: () => {
    if (database.value && typeof database.value.fetchResources === 'function') {
      return database.value.fetchResources()
    } else {
      console.error('Software page: Database component not found or fetchResources method not available')
    }
  }
})
</script>