<template>
  <IconoirProvider>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </IconoirProvider>
</template>

<script setup lang="ts">
import { IconoirProvider } from '@iconoir/vue'
import { providePageShellReady } from '~/composables/usePageShellReady'

// Provide shell state from the app root so layout remounts cannot reset it
providePageShellReady()
</script>
