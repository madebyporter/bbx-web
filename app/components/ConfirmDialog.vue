<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="handleCancel"></div>
        
        <!-- Dialog -->
        <div class="relative bg-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-neutral-700">
          <h3 class="text-lg font-semibold text-white mb-4">{{ title }}</h3>
          <p class="text-neutral-300 mb-6">{{ message }}</p>
          
          <div class="flex gap-3 justify-end">
            <button
              @click="handleCancel"
              class="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition-colors cursor-pointer"
            >
              {{ cancelText }}
            </button>
            <button
              @click="handleConfirm"
              :class="[
                'px-4 py-2 rounded transition-colors cursor-pointer',
                confirmDanger 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-amber-500 hover:bg-amber-600 text-neutral-900'
              ]"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  show: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmDanger?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm Action',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmDanger: false
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:show': [value: boolean]
}>()

const handleConfirm = () => {
  emit('confirm')
  emit('update:show', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:show', false)
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

