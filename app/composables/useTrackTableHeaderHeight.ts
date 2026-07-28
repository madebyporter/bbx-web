import { nextTick, onUnmounted, ref, watch, type Ref } from 'vue'

export function useTrackTableHeaderHeight(
  sourceRef: Ref<HTMLElement | null>,
  targetRef: Ref<HTMLElement | null>,
  isActive: () => boolean
) {
  const targetHeight = ref<number | null>(null)
  let observer: ResizeObserver | null = null

  const clearTargetHeight = () => {
    targetHeight.value = null
  }

  const syncHeight = () => {
    const source = sourceRef.value
    if (!source || !isActive()) {
      clearTargetHeight()
      return
    }

    targetHeight.value = Math.ceil(source.getBoundingClientRect().height)
  }

  const start = () => {
    stop()
    const source = sourceRef.value
    if (!source || !isActive()) return

    observer = new ResizeObserver(() => {
      syncHeight()
    })
    observer.observe(source)
    syncHeight()
  }

  const stop = () => {
    observer?.disconnect()
    observer = null
  }

  watch(
    [sourceRef, targetRef, () => isActive()],
    async () => {
      await nextTick()
      if (isActive() && sourceRef.value && targetRef.value) {
        start()
      } else {
        stop()
        clearTargetHeight()
      }
    },
    { flush: 'post', immediate: true }
  )

  onUnmounted(() => {
    stop()
    clearTargetHeight()
  })

  return { targetHeight }
}
