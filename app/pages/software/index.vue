<template>
  <!-- Only show list content when on /software exactly, not on child routes -->
  <PageContentSkeleton v-if="route.path === '/software' && !pageShellReady" />
  <div v-else-if="route.path === '/software'" class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
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
import { ref, inject, onMounted, onUnmounted, computed, watch, nextTick, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import Database from '~/components/Database.vue'
import LibraryHeader from '~/components/LibraryHeader.vue'
import PageContentSkeleton from '~/components/PageContentSkeleton.vue'
import { usePageShellReady } from '~/composables/usePageShellReady'
import { fetchApprovedResourcesForSearch } from '~/utils/resourceQueries'
import { unwrapExposedRef } from '~/utils/unwrapExposedRef'

const RESOURCE_SEARCH_FIELDS = ['name', 'creator', 'tags']

// Define page meta to ensure this only matches /software exactly
definePageMeta({
  key: 'software-list'
})

const route = useRoute()
const isDetailRoute = computed(() => route.path.startsWith('/software/'))
const pageShellReady = ref(isDetailRoute.value)
usePageShellReady(pageShellReady)

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

// Detail pages don't wait on the list fetch — keep the search bar visible immediately.
watch(isDetailRoute, (onDetail) => {
  if (onDetail) {
    pageShellReady.value = true
  }
}, { immediate: true })

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

const { data: searchContextData } = await useAsyncData(
  'software-search-context',
  () => fetchApprovedResourcesForSearch('software'),
  { server: true, default: () => [] }
)

// Computed property for resource count
const resourceCount = computed(() => {
  const resources = unwrapExposedRef(database.value?.resources)
  return Array.isArray(resources) ? resources.length : 0
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

const syncSearchContext = () => {
  if (!registerContextItems) {
    return
  }

  const fromList = unwrapExposedRef(database.value?.resources)
  if (route.path === '/software' && Array.isArray(fromList) && fromList.length > 0) {
    registerContextItems(fromList, RESOURCE_SEARCH_FIELDS)
    return
  }

  if (searchContextData.value?.length) {
    registerContextItems(searchContextData.value, RESOURCE_SEARCH_FIELDS)
  }
}

// Keep search context in sync on list, detail, and sidebar-only routes.
watch(() => database.value?.resources, () => syncSearchContext(), { deep: true })
watch(() => route.path, () => syncSearchContext())
watch(searchContextData, () => syncSearchContext(), { immediate: true })

// Register context items on mount — unblock search bar before data fetch
onMounted(async () => {
  pageShellReady.value = true
  await nextTick()
  if (route.path === '/software') {
    if (database.value?.fetchResources) {
      await database.value.fetchResources()
    }
    syncSearchContext()
  } else {
    syncSearchContext()
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