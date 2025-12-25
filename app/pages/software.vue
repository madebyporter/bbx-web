<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
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
      @edit-resource="$emit('edit-resource', $event)"
      @show-signup="$emit('show-signup')"
      :can-edit="isAdmin"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, computed, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import Database from '~/components/Database.vue'
import LibraryHeader from '~/components/LibraryHeader.vue'

// Set SEO meta tags - direct values for proper SSR
const seoTitleValue = 'Music Production Software'
const seoDescriptionValue = 'Discover music production software, plugins, and tools on Beatbox'

const currentUrl = useRequestURL().href
const requestOrigin = useRequestURL().origin
const ogImageUrl = `${requestOrigin}/img/og-image.jpg`

// Use useHead directly to ensure meta tags are set during SSR
useHead({
  title: seoTitleValue,
  meta: [
    { name: 'description', content: seoDescriptionValue },
    { property: 'og:title', content: seoTitleValue },
    { property: 'og:description', content: seoDescriptionValue },
    { property: 'og:url', content: currentUrl },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: ogImageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: seoTitleValue },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: seoTitleValue },
    { name: 'twitter:description', content: seoDescriptionValue },
    { name: 'twitter:image', content: ogImageUrl }
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