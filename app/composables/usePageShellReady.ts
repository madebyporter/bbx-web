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

export function providePageShellReady() {
  const shellContentReady = ref(false)
  const navShellReady = ref(false)

  const setShellContentReady = (ready: boolean) => {
    shellContentReady.value = ready
  }

  const setNavShellReady = (ready: boolean) => {
    navShellReady.value = ready
  }

  provide(shellContentReadyKey, shellContentReady)
  provide(setShellContentReadyKey, setShellContentReady)
  provide(navShellReadyKey, navShellReady)
  provide(setNavShellReadyKey, setNavShellReady)

  return { shellContentReady, navShellReady, setShellContentReady, setNavShellReady }
}

export function useShellContentReady() {
  return inject(shellContentReadyKey, ref(true))
}

export function useNavShellReadyState() {
  return inject(navShellReadyKey, ref(true))
}

export function useSetNavShellReady() {
  return inject(setNavShellReadyKey, null)
}

export function usePageShellReady(ready: MaybeRef<boolean>) {
  const setShellContentReady = inject(setShellContentReadyKey, null)

  const stop = watch(
    () => unref(ready),
    (isReady) => {
      setShellContentReady?.(isReady)
    },
    { immediate: true }
  )

  onUnmounted(() => {
    stop()
    setShellContentReady?.(false)
  })
}
