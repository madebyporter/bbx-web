<template>
  <Teleport to="body">
    <aside 
      v-if="show" 
      ref="modal"
      class="modal"
      :style="{ transform: `translateX(${initialX}%)`, opacity: modalOpacity }"
      @click="handleModalBackdropClick"
    >
      <div 
        class="modal-content"
        @click.stop
      >
        <div 
          @click="handleClose" 
          class="flex justify-center items-center border border-neutral-800 hover:border-neutral-700 p-4 w-fit rounded-md cursor-pointer fixed top-8 right-9"
        >
          <img src="/img/db/icon-close.svg" alt="Close" class="size-4 fill-neutral-700" />
        </div>
        
        <!-- Header slot -->
        <slot name="header"></slot>
        
        <!-- Main content slot -->
        <slot></slot>
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
    opacity: 0,
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

const handleModalBackdropClick = (e: Event) => {
  if (e.target === modal.value) {
    handleClose(e)
  }
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
</script> 