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

export function providePageShellReady() {
  const shellContentReady = ref(false)

  const setShellContentReady = (ready: boolean) => {
    shellContentReady.value = ready
  }

  provide(shellContentReadyKey, shellContentReady)
  provide(setShellContentReadyKey, setShellContentReady)

  return { shellContentReady, setShellContentReady }
}

export function useShellContentReady() {
  return inject(shellContentReadyKey, ref(true))
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
