<template>
  <Teleport to="body">
    <div
      v-if="props.show"
      class="fixed inset-0"
      :style="{ zIndex: props.zIndex }"
    >
      <button
        type="button"
        class="absolute inset-0 bg-black/40 cursor-default"
        aria-label="Close dialog"
        @click="handleClose"
      />

      <div
        v-if="!props.anchorRect"
        class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
      >
        <aside
          ref="panelRef"
          class="pointer-events-auto flex flex-col overflow-hidden rounded-md bg-neutral-900 ring-1 ring-neutral-800 shadow-lg"
          :style="panelSizeStyle"
          role="dialog"
          :aria-labelledby="titleId"
          @click.stop
        >
          <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-800 shrink-0">
            <slot name="header">
              <h2 :id="titleId" class="text-sm font-semibold text-neutral-100 truncate min-w-0">
                {{ props.title }}
              </h2>
            </slot>
            <button
              type="button"
              class="flex justify-center items-center border border-neutral-800 hover:border-neutral-700 p-2 rounded-md cursor-pointer shrink-0"
              aria-label="Close"
              @click="handleClose"
            >
              <img src="/img/db/icon-close.svg" alt="" class="size-4" />
            </button>
          </div>
          <div class="flex flex-col grow min-h-0">
            <div class="p-3 grow min-h-0 flex flex-col overflow-hidden">
              <slot />
            </div>
            <div v-if="$slots.footer" class="shrink-0 p-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <slot name="footer" />
            </div>
          </div>
        </aside>
      </div>

      <aside
        v-else
        ref="panelRef"
        class="fixed flex flex-col overflow-hidden rounded-md bg-neutral-900 ring-1 ring-neutral-800 shadow-lg"
        :style="anchoredPanelStyle"
        role="dialog"
        :aria-labelledby="titleId"
        @click.stop
      >
        <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-800 shrink-0">
          <slot name="header">
            <h2 :id="titleId" class="text-sm font-semibold text-neutral-100 truncate min-w-0">
              {{ props.title }}
            </h2>
          </slot>
          <button
            type="button"
            class="flex justify-center items-center border border-neutral-800 hover:border-neutral-700 p-2 rounded-md cursor-pointer shrink-0"
            aria-label="Close"
            @click="handleClose"
          >
            <img src="/img/db/icon-close.svg" alt="" class="size-4" />
          </button>
        </div>
        <div class="flex flex-col grow min-h-0">
          <div class="p-3 grow min-h-0 flex flex-col overflow-hidden">
            <slot />
          </div>
          <div v-if="$slots.footer" class="shrink-0 p-3 border-t border-neutral-800 flex items-center justify-end gap-2">
            <slot name="footer" />
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, watch } from 'vue'

export interface AnchorRect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

interface Props {
  show: boolean
  anchorRect?: AnchorRect | null
  title?: string
  width?: string
  height?: string
  zIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  anchorRect: null,
  title: '',
  width: 'min(560px, calc(100vw - 2rem))',
  height: 'min(400px, calc(100dvh - 2rem))',
  zIndex: 60,
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)
const titleId = useId()
const viewport = ref({ width: 0, height: 0 })

const PANEL_SPACE_THRESHOLD = 420
const VIEWPORT_MARGIN = 16
const ANCHOR_GAP = 8

const panelSizeStyle = computed(() => ({
  width: props.width,
  height: props.height,
  maxWidth: 'calc(100vw - 2rem)',
  maxHeight: 'calc(100dvh - 2rem)',
}))

const anchoredPanelStyle = computed(() => {
  const rect = props.anchorRect
  if (!rect) return panelSizeStyle.value

  const vw = viewport.value.width || (typeof window !== 'undefined' ? window.innerWidth : 560)
  const vh = viewport.value.height || (typeof window !== 'undefined' ? window.innerHeight : 800)

  const panelWidth = Math.min(560, vw - VIEWPORT_MARGIN * 2)

  const spaceBelow = vh - rect.bottom
  const openAbove = spaceBelow < PANEL_SPACE_THRESHOLD

  let left = rect.left
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - panelWidth - VIEWPORT_MARGIN))

  const style: Record<string, string> = {
    width: props.width,
    height: props.height,
    maxWidth: 'calc(100vw - 2rem)',
    maxHeight: 'calc(100dvh - 2rem)',
    left: `${left}px`,
  }

  if (openAbove) {
    style.bottom = `${vh - rect.top + ANCHOR_GAP}px`
  } else {
    style.top = `${rect.bottom + ANCHOR_GAP}px`
  }

  return style
})

function updateViewport() {
  if (typeof window === 'undefined') return
  viewport.value = { width: window.innerWidth, height: window.innerHeight }
}

function handleClose() {
  emit('update:show', false)
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.show) {
    e.preventDefault()
    handleClose()
  }
}

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) updateViewport()
  }
)

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  document.removeEventListener('keydown', onKeydown)
})
</script>
