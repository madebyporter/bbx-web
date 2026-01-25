<template>
  <div class="flex flex-row justify-between items-center gap-4 py-2 px-4 lg:py-4 border-b border-neutral-800">
    <div class="flex flex-col overflow-auto">
      <h1 class="text-xl lg:text-3xl font-bold truncate">{{ title }}</h1>
      <p v-if="description" class="text-neutral-400 text-sm mt-1 truncate">
        {{ description }}
      </p>
    </div>
    <div class="flex items-center gap-4">
      <p class="text-sm text-neutral-500 hidden md:block">
        {{ count }} {{ count === 1 ? itemLabel : itemLabel + 's' }}
      </p>
      <button 
        v-if="filterContext"
        @click="emit('open-filter-sort')"
        class="btn px-3! py-1.5! text-sm"
      >
        Filter & Sort
      </button>
      <button 
        v-if="showSettingsButton"
        @click="emit('open-settings')"
        class="btn px-3! py-1.5! text-sm"
      >
        Settings
      </button>
      <div v-if="isOwnProfile && showViewModeSelector" class="relative">
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
withDefaults(defineProps<{
  title: string
  description?: string
  count: number
  itemLabel?: string
  isOwnProfile?: boolean
  showViewMenu?: boolean
  viewMode?: 'final' | 'all'
  showViewModeSelector?: boolean
  filterContext?: 'software' | 'kits' | 'music' | null
  showSettingsButton?: boolean
}>(), {
  itemLabel: 'track',
  showViewModeSelector: true,
  filterContext: null,
  showSettingsButton: false
})

const emit = defineEmits<{
  'update:showViewMenu': [value: boolean]
  'update:viewMode': [value: 'final' | 'all']
  'open-filter-sort': []
  'open-settings': []
}>()

const handleViewModeChange = (mode: 'final' | 'all') => {
  emit('update:viewMode', mode)
  emit('update:showViewMenu', false)
}
</script>

