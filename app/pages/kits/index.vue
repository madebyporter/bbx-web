<template>
  <!-- Only show list content when on /kits exactly, not on child routes -->
  <PageContentSkeleton v-if="route.path === '/kits' && !pageShellReady" />
  <div v-else-if="route.path === '/kits'" class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
    <LibraryHeader 
      title="Music production kits" 
      :count="resourceCount"
      item-label="kit"
      filter-context="kits"
      :show-clear-filters="hasActiveFilterSort"
      @open-filter-sort="handleOpenFilterSort"
      @clear-filters="handleClearFilterSort"
    />
    <div class="overflow-x-scroll xl:overflow-auto">
      <DatabaseGrid 
        ref="databaseGrid" 
        type="sounds"
        @show-signup="$emit('show-signup')"
      />
    </div>
  </div>
  <!-- Render child routes (detail pages) -->
  <NuxtPage v-else />
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, computed, watch, nextTick, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import DatabaseGrid from '~/components/DatabaseGrid.vue'
import LibraryHeader from '~/components/LibraryHeader.vue'
import PageContentSkeleton from '~/components/PageContentSkeleton.vue'
import { usePageShellReady } from '~/composables/usePageShellReady'
import { fetchApprovedResourcesForSearch } from '~/utils/resourceQueries'
import { unwrapExposedRef } from '~/utils/unwrapExposedRef'

const RESOURCE_SEARCH_FIELDS = ['name', 'creator', 'tags']

const route = useRoute()
const isDetailRoute = computed(() => route.path.startsWith('/kits/'))
const pageShellReady = ref(isDetailRoute.value)
usePageShellReady(pageShellReady)

watch(isDetailRoute, (onDetail) => {
  if (onDetail) {
    pageShellReady.value = true
  }
}, { immediate: true })

// SSR SEO metadata for the kits list page
const siteOrigin = useSiteOrigin()
const kitsCanonical = `${siteOrigin}/kits`
const kitsSeoTitle = 'Music Production Kits & Sample Packs'
const kitsSeoDescription = 'Browse a curated collection of music production kits, sample packs, and sound libraries for producers, beatmakers, and sound designers.'

useSeoMeta({
  title: kitsSeoTitle,
  description: kitsSeoDescription,
  ogTitle: `${kitsSeoTitle} | Beatbox`,
  ogDescription: kitsSeoDescription,
  ogUrl: kitsCanonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: `${kitsSeoTitle} | Beatbox`,
  twitterDescription: kitsSeoDescription,
})

useHead({
  link: [
    { rel: 'canonical', href: kitsCanonical, key: 'canonical' }
  ]
})

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

const { data: searchContextData } = await useAsyncData(
  'kits-search-context',
  () => fetchApprovedResourcesForSearch('sounds'),
  { server: true, default: () => [] }
)

// Computed property for resource count
const resourceCount = computed(() => {
  const resources = unwrapExposedRef(databaseGrid.value?.resources)
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

  const fromList = unwrapExposedRef(databaseGrid.value?.resources)
  if (route.path === '/kits' && Array.isArray(fromList) && fromList.length > 0) {
    registerContextItems(fromList, RESOURCE_SEARCH_FIELDS)
    return
  }

  if (searchContextData.value?.length) {
    registerContextItems(searchContextData.value, RESOURCE_SEARCH_FIELDS)
  }
}

watch(() => databaseGrid.value?.resources, () => syncSearchContext(), { deep: true })
watch(() => route.path, () => syncSearchContext())
watch(searchContextData, () => syncSearchContext(), { immediate: true })

// Register context items on mount — unblock search bar before data fetch
onMounted(async () => {
  pageShellReady.value = true
  await nextTick()
  if (route.path === '/kits') {
    if (databaseGrid.value?.fetchResources) {
      await databaseGrid.value.fetchResources()
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
  databaseGrid,
  updateFiltersAndSort: (params: FilterSortParams) => {
    if (databaseGrid.value && typeof databaseGrid.value.updateFiltersAndSort === 'function') {
      databaseGrid.value.updateFiltersAndSort(params)
    } else {
      console.error('Kits page: DatabaseGrid component not found or updateFiltersAndSort method not available')
    }
  },
  fetchResources: () => {
    if (databaseGrid.value && typeof databaseGrid.value.fetchResources === 'function') {
      return databaseGrid.value.fetchResources()
    } else {
      console.error('Kits page: DatabaseGrid component not found or fetchResources method not available')
    }
  }
})
</script>

