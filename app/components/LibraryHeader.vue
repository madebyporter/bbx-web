<template>
  <div class="flex flex-row justify-between items-center gap-4 py-2 px-4 lg:py-4 border-b border-neutral-800">
    <div class="flex flex-col">
      <h1 class="text-sm lg:text-3xl font-bold">{{ title }}</h1>
      <p v-if="description" class="text-neutral-400 text-sm mt-1">
        {{ description }}
      </p>
    </div>
    <div class="flex items-center gap-4">
      <p class="text-sm text-neutral-500">
        {{ count }} {{ count === 1 ? 'track' : 'tracks' }}
      </p>
      <div v-if="isOwnProfile" class="relative">
        <button
          @click="emit('update:showViewMenu', !showViewMenu)"
          class="px-3 py-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded flex items-center gap-2 cursor-pointer"
        >
          {{ viewMode === 'final' ? 'Show Final' : 'Show All Versions' }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div
          v-if="showViewMenu"
          class="absolute right-0 mt-2 w-56 bg-neutral-800 border border-neutral-700 rounded shadow-lg z-50"
        >
          <button
            @click="handleViewModeChange('final')"
            class="w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 transition-colors cursor-pointer"
            :class="{ 'bg-neutral-700': viewMode === 'final' }"
          >
            Show Final
            <p class="text-xs text-neutral-500 mt-1">Curated selection only</p>
          </button>
          <button
            @click="handleViewModeChange('all')"
            class="w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 transition-colors cursor-pointer"
            :class="{ 'bg-neutral-700': viewMode === 'all' }"
          >
            Show All Versions
            <p class="text-xs text-neutral-500 mt-1">Include hidden tracks</p>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  count: number
  isOwnProfile?: boolean
  showViewMenu?: boolean
  viewMode?: 'final' | 'all'
}>()

const emit = defineEmits<{
  'update:showViewMenu': [value: boolean]
  'update:viewMode': [value: 'final' | 'all']
}>()

const handleViewModeChange = (mode: 'final' | 'all') => {
  emit('update:viewMode', mode)
  emit('update:showViewMenu', false)
}
</script>

