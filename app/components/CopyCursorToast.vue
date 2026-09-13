<template>
  <Teleport to="body">
    <div
      v-for="bubble in bubbles"
      :key="bubble.id"
      class="copy-cursor-bubble pointer-events-none fixed z-[60] whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-100 shadow-lg border border-neutral-700"
      :style="{ left: `${bubble.x}px`, top: `${bubble.y}px` }"
    >
      {{ bubble.text }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useCopyCursorToast } from '~/composables/useCopyCursorToast'

const { bubbles } = useCopyCursorToast()
</script>

<style scoped>
.copy-cursor-bubble {
  transform: translate(-50%, -100%);
  animation: copy-cursor-rise 420ms ease-out forwards, copy-cursor-fade 840ms ease-in 420ms forwards;
}

@keyframes copy-cursor-rise {
  from {
    transform: translate(-50%, -100%);
  }
  to {
    transform: translate(-50%, calc(-100% - 28px));
  }
}

@keyframes copy-cursor-fade {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
