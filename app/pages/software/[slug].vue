<template>
  <div class="grid grid-cols-1 md:grid-cols-[250px_1fr] grow overflow-hidden">
    <ResourceSidebar type-slug="software" :current-slug="slug" />
    <ResourceDetailPage :key="slug" :type-slug="'software'" :slug="slug" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ResourceSidebar from '~/components/ResourceSidebar.vue'
import ResourceDetailPage from '~/components/ResourceDetailPage.vue'

// [SEO-TIMING] Page-level SSR check
const pageStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
const pageContext = process.server ? 'SERVER' : process.client ? 'CLIENT' : 'UNKNOWN'
const pageRoute = typeof window !== 'undefined' ? window.location.pathname : (typeof useRoute !== 'undefined' ? useRoute().path : 'SSR')

const route = useRoute()
const slug = computed(() => route.params.slug as string)

onMounted(() => {
  const pageMountedTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
})
</script>

