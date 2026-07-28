<template>
  <div class="flex flex-col md:flex-row justify-start md:justify-between items-stretch gap-2 p-4">
    <div class="flex flex-col gap-2 overflow-auto">
      <div class="flex flex-row gap-2 items-end flex-wrap">
        <div class="h-8 lg:h-10 w-48 max-w-full rounded bg-neutral-800 animate-pulse" />
        <div class="h-5 lg:h-6 w-32 rounded bg-neutral-800 animate-pulse" />
      </div>
    </div>
    <div class="flex flex-row gap-2 items-center">
      <div class="h-8 w-14 rounded-full bg-neutral-800 animate-pulse" />
      <div class="h-8 w-20 rounded-full bg-neutral-800 animate-pulse" />
      <div v-if="showMembers" class="h-8 w-20 rounded-full bg-neutral-800 animate-pulse" />
      <div class="h-8 w-16 rounded-full bg-neutral-800 animate-pulse" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    showMembers?: boolean
  }>(),
  {
    showMembers: false,
  }
)
</script>
