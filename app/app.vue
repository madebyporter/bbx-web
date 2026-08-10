<template>
  <IconoirProvider>
    <div class="flex flex-col max-h-dvh min-h-dvh">
      <div class="grow min-h-0 overflow-hidden flex flex-col">
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>
      <!-- Outside NuxtLayout: page skeletons must never unmount the player -->
      <Player />
    </div>
  </IconoirProvider>
</template>

<script setup lang="ts">
import { IconoirProvider } from '@iconoir/vue'
import { providePageShellReady } from '~/composables/usePageShellReady'

// Provide shell state from the app root so layout remounts cannot reset it
providePageShellReady()
</script>
