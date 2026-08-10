import {
  inject,
  onUnmounted,
  provide,
  ref,
  unref,
  watch,
  type InjectionKey,
  type MaybeRef,
  type Ref,
} from 'vue'

const shellContentReadyKey: InjectionKey<Ref<boolean>> = Symbol('shellContentReady')
const setShellContentReadyKey: InjectionKey<(ready: boolean) => void> = Symbol('setShellContentReady')
const navShellReadyKey: InjectionKey<Ref<boolean>> = Symbol('navShellReady')
const setNavShellReadyKey: InjectionKey<(ready: boolean) => void> = Symbol('setNavShellReady')

// Module-level — survive layout remounts so search/nav chrome does not reset per page
const shellContentReady = ref(false)
const navShellReady = ref(false)

export function providePageShellReady() {
  const setShellContentReady = (ready: boolean) => {
    // Sticky: once the app shell is ready, page navigations must not hide it again
    if (ready) {
      shellContentReady.value = true
    }
  }

  const setNavShellReady = (ready: boolean) => {
    if (ready) {
      navShellReady.value = true
    }
  }

  provide(shellContentReadyKey, shellContentReady)
  provide(setShellContentReadyKey, setShellContentReady)
  provide(navShellReadyKey, navShellReady)
  provide(setNavShellReadyKey, setNavShellReady)

  return { shellContentReady, navShellReady, setShellContentReady, setNavShellReady }
}

export function useShellContentReady() {
  return inject(shellContentReadyKey, shellContentReady)
}

export function useNavShellReadyState() {
  return inject(navShellReadyKey, navShellReady)
}

export function useSetNavShellReady() {
  return inject(setNavShellReadyKey, null)
}

/** Routes where the search bar should not wait on list/detail data fetches */
export function isResourceShellRoute(path: string): boolean {
  return /^\/(software|kits)(\/|$)/.test(path)
}

export function usePageShellReady(ready: MaybeRef<boolean>) {
  const setShellContentReady = inject(setShellContentReadyKey, null)
  const route = useRoute()

  const sync = () => {
    if (unref(ready)) {
      setShellContentReady?.(true)
    }
  }

  const stopReady = watch(() => unref(ready), sync, { immediate: true })

  // Re-assert when this page stays mounted across child route swaps (e.g. /software/:slug).
  const stopRoute = watch(() => route.fullPath, sync)

  onUnmounted(() => {
    stopReady()
    stopRoute()
  })
}
