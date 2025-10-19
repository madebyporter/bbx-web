<template>
  <Teleport to="body">
    <aside v-if="show" ref="modal"
      class="p-4 fixed right-2 lg:right-2 top-2 lg:top-2 bottom-2 lg:bottom-2 left-2 lg:left-auto lg:w-2/5 bg-neutral-900 ring-1 ring-neutral-800 text-neutral-400 rounded-md overflow-visible z-50"
      :style="{ transform: `translateX(${initialX}%)`, opacity: modalOpacity }">
      <div class="flex flex-col gap-4 justify-between h-full">
        <div class="flex flex-row justify-between items-center">

          <div class="h-[50px] flex items-center text-white font-semibold" @click.stop>
            <slot name="header"></slot>
          </div>

          <div @click="handleClose"
            class="flex justify-center items-center border border-neutral-800 hover:border-neutral-700 p-4 w-fit rounded-md cursor-pointer">
            <img src="/img/db/icon-close.svg" alt="Close" class="size-4 fill-neutral-700" />
          </div>
        </div>
        <!-- Main content slot -->
        <div class="grow flex flex-col gap-0 overflow-auto no-scrollbar" @click.stop>
          <slot></slot>
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import gsap from 'gsap'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['update:show'])

const modal = ref<HTMLElement | null>(null)
const initialX = ref(100)
const modalOpacity = ref(0)

const animateIn = () => {
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

const animateOut = () => {
  if (!modal.value) return
  
  gsap.to(modal.value, {
    duration: 0.3,
    x: '100%',
    ease: 'power2.in',
    onComplete: () => {
      emit('update:show', false)
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