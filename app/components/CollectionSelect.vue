<template>
  <div class="relative" ref="container">
    <!-- Input with tags -->
    <div 
      :class="[
        'input-wrapper border rounded cursor-text transition-colors',
        size === 'sm' ? 'p-2' : 'p-3',
        'border-neutral-700 hover:border-neutral-600 bg-neutral-900',
        isOpen ? 'border-neutral-600' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @click="!disabled && openDropdown()"
    >
      <!-- Selected tags -->
      <div v-if="selectedCollections.length > 0" class="flex flex-wrap gap-1 mb-2">
        <span 
          v-for="collection in selectedCollections" 
          :key="collection.id"
          class="inline-flex items-center gap-1 px-2 py-1 bg-neutral-700 rounded text-xs text-neutral-200"
        >
          {{ collection.name }}
          <button 
            @click.stop="removeCollection(collection.id)"
            class="hover:text-red-400 text-neutral-400"
            :disabled="disabled"
          >
            ×
          </button>
        </span>
      </div>
      
      <!-- Search input -->
      <input 
        ref="input"
        v-model="searchQuery"
        :placeholder="selectedCollections.length > 0 ? 'Add more collections...' : 'Search or add collections...'"
        :class="[
          'w-full bg-transparent border-none outline-none text-neutral-200 placeholder-neutral-500',
          size === 'sm' ? 'text-sm' : 'text-base'
        ]"
        :disabled="disabled"
        @focus="openDropdown()"
        @keydown.escape="closeDropdown()"
        @keydown.enter.prevent="handleEnterKey"
      />
    </div>
    
    <!-- Dropdown -->
    <div 
      v-if="isOpen" 
      class="absolute z-10 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
    >
      <!-- Filtered collections -->
      <div 
        v-for="collection in filteredCollections" 
        :key="collection.id"
        class="flex items-center gap-2 p-2 hover:bg-neutral-700 cursor-pointer"
        @click="toggleCollection(collection.id)"
      >
        <input 
          type="checkbox" 
          :checked="isSelected(collection.id)"
          class="w-4 h-4 text-amber-600 bg-neutral-700 border-neutral-600 rounded focus:ring-amber-500"
          @click.stop="toggleCollection(collection.id)"
        />
        <label class="flex-1 cursor-pointer text-neutral-200">{{ collection.name }}</label>
      </div>
      
      <!-- Create button when no match -->
      <button 
        v-if="showCreateButton" 
        @click="handleCreate"
        class="w-full text-left p-2 text-amber-400 hover:bg-amber-600/10 border-t border-neutral-700 flex items-center gap-2 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create "{{ searchQuery }}"
      </button>
      
      <!-- No collections message -->
      <div v-if="filteredCollections.length === 0 && !showCreateButton" class="p-3 text-neutral-500 text-center text-sm">
        No collections found
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

interface Collection {
  id: number
  name: string
  slug: string
}

interface Props {
  modelValue: number[]
  collections: Collection[]
  disabled?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  'create-collection': [name: string]
}>()

// State
const isOpen = ref(false)
const searchQuery = ref('')
const container = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)

// Computed
const selectedCollections = computed(() => {
  return props.collections.filter(col => props.modelValue.includes(col.id))
})

const filteredCollections = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.collections
  }
  
  const query = searchQuery.value.toLowerCase()
  return props.collections.filter(collection => 
    collection.name.toLowerCase().includes(query)
  )
})

const showCreateButton = computed(() => {
  if (!searchQuery.value.trim()) return false
  
  const query = searchQuery.value.toLowerCase()
  return !props.collections.some(col => col.name.toLowerCase() === query)
})

// Methods
const openDropdown = () => {
  isOpen.value = true
  nextTick(() => {
    input.value?.focus()
  })
}

const closeDropdown = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const toggleCollection = (id: number) => {
  const current = [...props.modelValue]
  const index = current.indexOf(id)
  
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(id)
  }
  
  emit('update:modelValue', current)
}

const removeCollection = (id: number) => {
  const current = [...props.modelValue]
  const index = current.indexOf(id)
  if (index > -1) {
    current.splice(index, 1)
    emit('update:modelValue', current)
  }
}

const isSelected = (id: number) => {
  return props.modelValue.includes(id)
}

const handleCreate = () => {
  if (!searchQuery.value.trim()) return
  
  emit('create-collection', searchQuery.value.trim())
  closeDropdown()
}

const handleEnterKey = () => {
  if (showCreateButton.value) {
    handleCreate()
  } else if (filteredCollections.value.length === 1 && filteredCollections.value[0]) {
    toggleCollection(filteredCollections.value[0].id)
  }
}


// Watch for external changes to close dropdown
watch(() => props.modelValue, () => {
  // Keep dropdown open for better UX when selections change
})


// Click outside to close
const handleClickOutside = (event: Event) => {
  if (!isOpen.value) return
  
  const target = event.target as Node
  
  // Don't close if clicking inside our component
  if (container.value && container.value.contains(target)) {
    return
  }
  
  // Use nextTick to ensure the click event is fully processed
  nextTick(() => {
    if (isOpen.value) {
      closeDropdown()
    }
  })
}

// Lifecycle
onMounted(() => {
  // Use capture phase to ensure we catch the event before it's stopped
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>
