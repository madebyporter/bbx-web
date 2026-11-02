import { onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(
  containerRef: Ref<HTMLElement | null | undefined>,
  active: Ref<boolean>,
) {
  let previouslyFocused: HTMLElement | null = null

  function getFocusable(): HTMLElement[] {
    const root = containerRef.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    )
  }

  function onKeydown(event: KeyboardEvent) {
    if (!active.value || event.key !== 'Tab') return
    const focusable = getFocusable()
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const current = document.activeElement as HTMLElement | null

    if (event.shiftKey) {
      if (current === first || !containerRef.value?.contains(current)) {
        event.preventDefault()
        last.focus()
      }
    } else if (current === last || !containerRef.value?.contains(current)) {
      event.preventDefault()
      first.focus()
    }
  }

  function activate() {
    previouslyFocused = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeydown)
    const focusable = getFocusable()
    const preferred =
      containerRef.value?.querySelector<HTMLElement>('[data-autofocus]') || focusable[0]
    preferred?.focus()
  }

  function deactivate() {
    document.removeEventListener('keydown', onKeydown)
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }

  watch(
    active,
    (isActive) => {
      if (!import.meta.client) return
      if (isActive) {
        requestAnimationFrame(() => activate())
      } else {
        deactivate()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    deactivate()
  })
}
