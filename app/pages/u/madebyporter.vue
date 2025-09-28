<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <header class="px-2 pt-8 pb-4 border-b border-neutral-800">
      <h1 class="text-xl lg:text-3xl font-bold indent-1">Made by Porter</h1>
    </header>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useAuth } from '~/composables/useAuth'

  definePageMeta({
    name: 'index',
    layout: 'users'
  })
</script>