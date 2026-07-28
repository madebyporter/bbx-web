import { onMounted, onUnmounted, watch, type Ref } from 'vue'

interface UseInfiniteScrollOptions {
  sentinelRef: Ref<HTMLElement | null>
  enabled: () => boolean
  loading: () => boolean
  onLoadMore: () => void | Promise<void>
  rootSelector?: string
}

export function useInfiniteScroll({
  sentinelRef,
  enabled,
  loading,
  onLoadMore,
  rootSelector = '#content',
}: UseInfiniteScrollOptions) {
  let observer: IntersectionObserver | null = null

  const disconnect = () => {
    observer?.disconnect()
    observer = null
  }

  const connect = () => {
    disconnect()
    const sentinel = sentinelRef.value
    if (!sentinel || !enabled()) return

    const root = document.querySelector(rootSelector)
    observer = new IntersectionObserver(
      (entries) => {
        if (!enabled() || loading()) return
        if (entries.some((entry) => entry.isIntersecting)) {
          void onLoadMore()
        }
      },
      {
        root,
        rootMargin: '200px 0px',
        threshold: 0,
      }
    )
    observer.observe(sentinel)
  }

  onMounted(() => {
    watch(
      [sentinelRef, () => enabled()],
      () => {
        if (enabled()) {
          connect()
        } else {
          disconnect()
        }
      },
      { flush: 'post', immediate: true }
    )
  })

  onUnmounted(disconnect)
}
