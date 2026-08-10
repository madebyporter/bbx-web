<template>
  <div class="relative grid grid-cols-1 md:grid-cols-[250px_1fr] grow overflow-hidden">
    <ResourceSidebar
      type-slug="kits"
      :current-slug="slug"
    />
    <ResourceDetailPage
      :key="slug"
      :type-slug="'kits'"
      :slug="slug"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ResourceSidebar from '~/components/ResourceSidebar.vue'
import ResourceDetailPage from '~/components/ResourceDetailPage.vue'
import { usePageShellReady } from '~/composables/usePageShellReady'
import { fetchApprovedResourcesForSearch } from '~/utils/resourceQueries'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const pageShellReady = ref(true)
usePageShellReady(pageShellReady)

const registerContextItems = inject<(items: any[], fields: string[]) => void>('registerContextItems')
const unregisterContextItems = inject<() => void>('unregisterContextItems')
const RESOURCE_SEARCH_FIELDS = ['name', 'creator', 'tags']

const { data: searchContextData } = await useAsyncData(
  'kits-search-context',
  () => fetchApprovedResourcesForSearch('sounds'),
  { server: true, default: () => [] }
)

const syncSearchContext = () => {
  if (registerContextItems && searchContextData.value?.length) {
    registerContextItems(searchContextData.value, RESOURCE_SEARCH_FIELDS)
  }
}

watch(searchContextData, () => syncSearchContext(), { immediate: true })

onMounted(() => {
  syncSearchContext()
})

onUnmounted(() => {
  unregisterContextItems?.()
})
</script>
