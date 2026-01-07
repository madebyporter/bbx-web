<template>
  <ResourceDetailPage :type-slug="'software'" :slug="slug" />
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

