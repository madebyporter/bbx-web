<template>
  <IconoirProvider>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <div
      v-if="showAuthPaintGate"
      class="fixed inset-0 z-[100] bg-neutral-900"
      aria-hidden="true"
    />
  </IconoirProvider>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IconoirProvider } from '@iconoir/vue'
import { providePageShellReady } from '~/composables/usePageShellReady'
import { useAuth } from '~/composables/useAuth'

function shouldHoldAuthPaintGate(isReady: boolean, hasUser: boolean, path: string) {
  if (!isReady) return true
  if (path === '/' && hasUser) return true
  return false
}

// Provide shell state from the app root so layout remounts cannot reset it
providePageShellReady()

const { user, isReady } = useAuth()
const route = useRoute()

/** Once the gate has lifted, do not black out the viewport again on later navigations */
const gateReleased = ref(false)

const showAuthPaintGate = computed(() => {
  if (gateReleased.value) return false
  return shouldHoldAuthPaintGate(isReady.value, !!user.value, route.path)
})

watch(
  () => shouldHoldAuthPaintGate(isReady.value, !!user.value, route.path),
  (hold) => {
    if (!hold) {
      gateReleased.value = true
    }
  },
  { immediate: true },
)
</script>
