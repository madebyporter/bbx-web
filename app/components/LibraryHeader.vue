<template>
  <div class="flex flex-row justify-between items-center gap-4 p-4 border-b border-neutral-800">
    <div>
      <h1 class="text-3xl font-bold">{{ title }}</h1>
      <p v-if="description" class="text-neutral-400 mt-2">
        {{ description }}
      </p>
    </div>
    <p class="text-sm text-neutral-500">
      {{ count }} {{ count === 1 ? 'track' : 'tracks' }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  count: number
}>()
</script>

