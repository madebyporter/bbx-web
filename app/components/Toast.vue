<template>
  <div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style="position: fixed !important; z-index: 9999 !important;">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'pointer-events-auto',
          'p-4 rounded-lg shadow-lg',
          'min-w-[280px] max-w-[400px]',
          'flex items-center justify-between gap-3',
          'animate-slide-in',
          toastClasses[toast.type]
        ]"
      >
        <div class="flex items-center gap-3 flex-1">
          <!-- Processing spinner -->
          <svg
            v-if="toast.type === 'processing'"
            class="animate-spin h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          
          <!-- Success checkmark -->
          <svg
            v-else-if="toast.type === 'success'"
            class="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          
          <!-- Error X -->
          <svg
            v-else-if="toast.type === 'error'"
            class="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          
          <!-- Info icon -->
          <svg
            v-else
            class="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          
          <span class="text-sm font-medium flex-1">{{ toast.message }}</span>
        </div>
        
        <!-- Close button (only for non-processing toasts or errors) -->
        <button
          v-if="toast.type !== 'processing' || toast.type === 'error'"
          @click="removeToast(toast.id)"
          class="flex-shrink-0 hover:opacity-70 transition-opacity"
          :aria-label="'Close notification'"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useToast } from '~/composables/useToast'

const { toasts, removeToast } = useToast()

// Debug: Log when toasts change
watch(toasts, (newToasts) => {
  console.log('Toast count:', newToasts.length, newToasts)
}, { deep: true })

const toastClasses = {
  processing: 'bg-yellow-400 text-black',
  error: 'bg-red-600 text-white',
  success: 'bg-neutral-800 text-white',
  info: 'bg-neutral-800 text-white'
}
</script>

<style scoped>
/* Toast transition animations */
.toast-enter-active {
  animation: slide-in 0.3s ease-out;
}

.toast-leave-active {
  animation: slide-out 0.2s ease-in;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
