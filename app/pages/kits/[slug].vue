<template>
  <PageContentSkeleton v-if="!pageShellReady" />
  <div v-else class="grid grid-cols-1 md:grid-cols-[250px_1fr] grow overflow-hidden">
    <ResourceSidebar type-slug="kits" :current-slug="slug" />
    <ResourceDetailPage :key="slug" :type-slug="'kits'" :slug="slug" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import ResourceSidebar from '~/components/ResourceSidebar.vue'
import ResourceDetailPage from '~/components/ResourceDetailPage.vue'
import PageContentSkeleton from '~/components/PageContentSkeleton.vue'
import { usePageShellReady } from '~/composables/usePageShellReady'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const pageShellReady = ref(false)
usePageShellReady(pageShellReady)

onMounted(async () => {
  await nextTick()
  pageShellReady.value = true
})
</script>

