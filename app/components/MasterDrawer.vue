<template>
  <Teleport to="body">
    <aside v-if="show" ref="modal"
      class="fixed right-2 lg:right-2 top-2 lg:top-2 bottom-2 lg:bottom-2 left-2 lg:left-auto lg:w-2/5 bg-neutral-900 ring-1 ring-neutral-800 text-neutral-400 rounded-md overflow-visible z-50"
      :style="{ transform: `translateX(${initialX}%)`, opacity: modalOpacity }">
      <div class="flex flex-col gap-0 justify-between h-full divide-y divide-neutral-800">
        <div class="flex flex-row gap-2 justify-between items-center p-4">

          <div class="grow h-[50px] flex items-center text-white font-semibold min-w-0" @click.stop>
            <slot name="header"></slot>
          </div>

          <div class="flex items-center gap-2 shrink-0" @click.stop>
            <slot name="header-actions" />
            <Button
              type="button"
              variant="outlined"
              square
              title="Close"
              aria-label="Close"
              @click="handleClose"
            >
              <Xmark class="size-5" stroke-width="1.5" />
            </Button>
          </div>
        </div>
        <!-- Main content slot -->
        <div class="grow flex flex-col gap-0 overflow-auto no-scrollbar p-4 min-h-0" @click.stop>
          <slot></slot>
        </div>
        <!-- Footer CTAs — outside padded scroll content (like header) -->
        <div
          v-if="slots.footer"
          class="shrink-0 p-4"
          @click.stop
        >
          <slot name="footer" />
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, useSlots } from 'vue'
import { Xmark } from '@iconoir/vue'
import gsap from 'gsap'
import Button from '~/components/Button.vue'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['update:show', 'close'])
const slots = useSlots()

const modal = ref<HTMLElement | null>(null)
const initialX = ref(100)
const modalOpacity = ref(0)

const runAnimateIn = () => {
  if (!modal.value) return
  modalOpacity.value = 1
  gsap.to(modal.value, {
    duration: 0.3,
    x: 0,
    ease: 'power2.out',
    onComplete: () => {
      initialX.value = 0
    }
  })
}

const animateIn = () => {
  if (modal.value) {
    runAnimateIn()
    return
  }
  // Teleport + v-if can leave the ref empty for an extra frame
  nextTick(() => {
    if (modal.value) {
      runAnimateIn()
      return
    }
    requestAnimationFrame(() => {
      runAnimateIn()
    })
  })
}

const animateOut = () => {
  if (!modal.value) return
  
  gsap.to(modal.value, {
    duration: 0.3,
    x: '100%',
    ease: 'power2.in',
    onComplete: () => {
      emit('update:show', false)
      emit('close')
      initialX.value = 100
      modalOpacity.value = 0
    }
  })
}

const handleClose = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  animateOut()
}


watch(() => props.show, (newVal, oldVal) => {
  if (newVal) {
    initialX.value = 100
    nextTick(() => {
      animateIn()
    })
  } else if (oldVal) {
    animateOut()
  }
}, { immediate: true })

defineExpose({ animateOut })
</script> 