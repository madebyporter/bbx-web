<template>
  <div class="flex flex-col gap-2 h-full min-h-0">
    <div class="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
      <label
        v-for="collection in sortedCollections"
        :key="collection.id"
        class="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-neutral-800 cursor-pointer"
        :class="disabled ? 'opacity-50 pointer-events-none' : ''"
      >
        <input
          type="checkbox"
          :checked="isSelected(collection.id)"
          :disabled="disabled"
          class="w-4 h-4 shrink-0 text-amber-600 bg-neutral-700 border-neutral-600 rounded focus:ring-amber-500 cursor-pointer"
          @change="toggleCollection(collection.id)"
        />
        <span class="text-sm text-neutral-200 truncate">{{ collection.name }}</span>
      </label>
      <p v-if="sortedCollections.length === 0" class="text-sm text-neutral-500 py-6 text-center">
        No collections yet
      </p>
    </div>

    <div class="shrink-0 border-t border-neutral-800 pt-2">
      <Button
        v-if="!showNewInput"
        variant="ghost"
        class="justify-start gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-neutral-800 w-full !px-2"
        :disabled="disabled"
        @click="openNewInput"
      >
        + New collection
      </Button>
      <div v-else class="flex gap-2 items-center">
        <input
          ref="newInputRef"
          v-model="newName"
          type="text"
          placeholder="Collection name"
          class="flex-1 min-w-0 p-2 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 text-sm placeholder-neutral-500 outline-none focus:border-amber-400"
          :disabled="disabled"
          @keydown.enter.prevent="confirmNew"
          @keydown.escape.prevent="cancelNew"
        />
        <Button variant="ghost" size="sm" :disabled="disabled" @click="cancelNew">
          Cancel
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

interface Collection {
  id: number
  name: string
  slug: string
}

interface Props {
  modelValue: number[]
  collections: Collection[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  'create-collection': [name: string]
}>()

const showNewInput = ref(false)
const newName = ref('')
const newInputRef = ref<HTMLInputElement | null>(null)

const sortedCollections = computed(() =>
  [...props.collections].sort((a, b) => a.name.localeCompare(b.name))
)

function isSelected(id: number) {
  return props.modelValue.includes(id)
}

function toggleCollection(id: number) {
  const current = [...props.modelValue]
  const index = current.indexOf(id)
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(id)
  }
  emit('update:modelValue', current)
}

async function openNewInput() {
  showNewInput.value = true
  await nextTick()
  newInputRef.value?.focus()
}

function cancelNew() {
  showNewInput.value = false
  newName.value = ''
}

function confirmNew() {
  const name = newName.value.trim()
  if (!name) return
  emit('create-collection', name)
  newName.value = ''
  showNewInput.value = false
}
</script>
