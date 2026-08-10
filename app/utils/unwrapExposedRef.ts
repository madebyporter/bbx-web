import { isRef, type Ref } from 'vue'

export function unwrapExposedRef<T>(value: T | Ref<T> | undefined | null): T | undefined {
  if (value == null) {
    return undefined
  }

  if (isRef(value)) {
    return value.value
  }

  return value
}
