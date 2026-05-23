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
      <Button
        v-if="filterContext"
        variant="secondary"
        class="btn px-3! py-1.5! text-sm"
        @click="emit('open-filter-sort')"
      >
        Filter & Sort
      </Button>
      <Button
        v-if="showSettingsButton"
        variant="secondary"
        class="btn px-3! py-1.5! text-sm"
        @click="emit('open-settings')"
      >
        Settings
      </Button>
      <div v-if="isOwnProfile && showViewModeSelector" class="relative">
        <Button
          variant="ghost"
          class="!px-3 !py-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded gap-2"
          @click="emit('update:showViewMenu', !showViewMenu)"
        >
          {{ viewMode === 'final' ? 'Show Final' : 'Show All Versions' }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </Button>
        <div
          v-if="showViewMenu"
          class="absolute right-0 mt-2 w-56 bg-neutral-800 border border-neutral-700 rounded shadow-lg z-50"
        >
          <Button
            variant="ghost"
            full-width
            class="!px-4 !py-2 text-left text-sm hover:bg-neutral-700 justify-start rounded-none"
            :class="{ 'bg-neutral-700': viewMode === 'final' }"
            @click="handleViewModeChange('final')"
          >
            Show Final
            <p class="text-xs text-neutral-500 mt-1">Curated selection only</p>
          </Button>
          <Button
            variant="ghost"
            full-width
            class="!px-4 !py-2 text-left text-sm hover:bg-neutral-700 justify-start rounded-none"
            :class="{ 'bg-neutral-700': viewMode === 'all' }"
            @click="handleViewModeChange('all')"
          >
            Show All Versions
            <p class="text-xs text-neutral-500 mt-1">Include hidden tracks</p>
          </Button>
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

