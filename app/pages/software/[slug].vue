<template>
  <div class="grid grid-cols-1 md:grid-cols-[250px_1fr] grow overflow-hidden">
    <ResourceSidebar type-slug="software" :current-slug="slug" />
    <ResourceDetailPage :key="slug" :type-slug="'software'" :slug="slug" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ResourceSidebar from '~/components/ResourceSidebar.vue'
import ResourceDetailPage from '~/components/ResourceDetailPage.vue'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
</script>

