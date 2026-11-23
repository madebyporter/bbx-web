<template>
  <input
    ref="inputRef"
    :id="id"
    :name="name"
    :type="type"
    :value="displayValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :autocomplete="autocomplete"
    :inputmode="inputmode"
    :class="classes"
    v-bind="inputAttrs"
    @input="onInput"
  />
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'

type InputType = 'text' | 'number' | 'email' | 'password' | 'url' | 'search'
type Size = 'md' | 'sm'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    type?: InputType
    size?: Size
    disabled?: boolean
    required?: boolean
    fullWidth?: boolean
    id?: string
    name?: string
    placeholder?: string
    autocomplete?: string
    inputmode?:
      | 'none'
      | 'text'
      | 'decimal'
      | 'numeric'
      | 'tel'
      | 'search'
      | 'email'
      | 'url'
  }>(),
  {
    modelValue: '',
    type: 'text',
    size: 'md',
    disabled: false,
    required: false,
    fullWidth: true,
    id: undefined,
    name: undefined,
    placeholder: undefined,
    autocomplete: undefined,
    inputmode: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
}>()

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const inputRef = ref<HTMLInputElement | null>(null)

const sizeClasses: Record<Size, string> = {
  md: 'p-3 h-12',
  sm: 'p-2.5 h-8 text-sm',
}

const baseClasses =
  'border border-neutral-700 hover:border-neutral-600 rounded-sm bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed'

const classes = computed(() => [
  baseClasses,
  sizeClasses[props.size],
  props.fullWidth ? 'w-full' : 'min-w-0 flex-1',
  attrs.class,
])

const inputAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const displayValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return ''
  return String(props.modelValue)
})

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const raw = target.value

  if (props.type === 'number') {
    if (raw === '') {
      emit('update:modelValue', null)
      return
    }
    const parsed = Number(raw)
    emit('update:modelValue', Number.isNaN(parsed) ? raw : parsed)
    return
  }

  emit('update:modelValue', raw)
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  el: inputRef,
})
</script>
