<template>
  <div class="grid grid-cols-1 md:grid-cols-[250px_1fr] grow overflow-hidden">
    <div class="hidden md:flex border-r border-neutral-800 h-full">sidebar</div>
    <ResourceDetailPage :type-slug="'software'" :slug="slug" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ResourceDetailPage from '~/components/ResourceDetailPage.vue'

definePageMeta({
  key: (route) => `software-${route.params.slug}`
})

const route = useRoute()
const slug = computed(() => route.params.slug as string)
</script>

