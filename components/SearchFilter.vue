<template>
  <div class="flex flex-row gap-4 py-4 pr-4">
    <div class="grow flex relative">
      <img src="/img/db/icon-search.svg" alt="Search" class="absolute z-10 top-[50%] translate-y-[-50%] px-4" />
      <input 
        ref="searchInput"
        type="text" 
        v-model="searchQuery"
        @input="onSearch"
        class="rounded-full bg-neutral-200 text-left p-4 px-12 grow z-0 relative" 
        placeholder="Search for a DAW, VST, Plugin or Software (CMD/CTRL+K)" 
      />
    </div>
    <button @click="$emit('open-filter-modal')" class="btn">Filter & Sort</button>
    <button @click="$emit('open-modal')" class="btn">Submit Resource</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const searchQuery = ref('')
const searchInput = ref(null)
const emit = defineEmits(['open-modal', 'open-filter-modal', 'search'])

const onSearch = () => {
  emit('search', searchQuery.value)
}

const handleKeydown = (e) => {
  // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault() // Prevent default browser behavior
    searchInput.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>