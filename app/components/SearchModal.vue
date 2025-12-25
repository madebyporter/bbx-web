<template>
  <div
    v-if="show"
    class="absolute inset-x-0 top-full z-[1000]"
  >
    <!-- Results Drawer - Positioned absolutely relative to SearchFilter parent -->
    <div
      ref="modalRef"
      class="relative bg-neutral-900 border-b border-neutral-800 shadow-xl overflow-auto max-h-[calc(100vh-80px-125px)] lg:max-h-[calc(100vh-8rem)]"
      @click.stop
    >
        <!-- Results -->
        <div v-if="localQuery.trim()" class="h-fit flex flex-col lg:flex-row">
          <!-- Site-wide Search Column -->
          <div class="flex-1 border-r border-neutral-800 min-h-[200px]">
            <div class="p-4 border-b border-neutral-800 bg-neutral-900/50">
              <h3 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Site Search</h3>
            </div>
            <div class="p-4">
              <div v-if="isSearching" class="flex items-center justify-center py-8">
                <div class="text-neutral-500">Searching...</div>
              </div>
              <div v-else-if="siteResults.length === 0" class="text-neutral-500 text-sm py-8 text-center">
                No results found
              </div>
              <div v-else class="space-y-1">
                <div
                  v-for="(result, index) in siteResults"
                  :key="`site-${result.type}-${result.id}`"
                  @click="handleResultClick(result, 'site')"
                  @mouseenter="selectedIndex = { column: 'site', index }"
                  :class="[
                    'p-3 rounded-md cursor-pointer',
                    isSelected('site', index) ? 'bg-neutral-900' : 'hover:bg-neutral-900'
                  ]"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-white truncate">{{ result.title }}</div>
                      <div v-if="result.subtitle" class="text-sm text-neutral-400 truncate">{{ result.subtitle }}</div>
                      <div class="text-xs text-neutral-500 mt-1">{{ getTypeLabel(result.type) }}</div>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                      <button
                        v-if="hasDetailPage(result)"
                        @click.stop="navigateToDetail(result)"
                        class="text-xs px-2 py-1 text-amber-400 hover:text-amber-300 hover:underline"
                      >
                        View Detail
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Context Search Column -->
          <div v-if="hasContext" class="flex-1 min-h-[200px]">
            <div class="p-4 border-b border-neutral-800 bg-neutral-900/50">
              <h3 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider">On This Page</h3>
            </div>
            <div class="p-4">
              <div v-if="isSearching" class="flex items-center justify-center py-8">
                <div class="text-neutral-500">Searching...</div>
              </div>
              <div v-else-if="contextResults.length === 0" class="text-neutral-500 text-sm py-8 text-center">
                No results found on this page
              </div>
              <div v-else class="space-y-1">
                <div
                  v-for="(result, index) in contextResults"
                  :key="`context-${result.type}-${result.id}`"
                  @click="handleResultClick(result, 'context')"
                  @mouseenter="selectedIndex = { column: 'context', index }"
                  class="p-3 rounded-md cursor-pointer"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-white truncate">{{ result.title }}</div>
                      <div v-if="result.subtitle" class="text-sm text-neutral-400 truncate">{{ result.subtitle }}</div>
                      <div class="text-xs text-neutral-500 mt-1">{{ getTypeLabel(result.type) }}</div>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                      <button
                        @click.stop="scrollToItem(result)"
                        class="text-xs px-2 py-1 text-amber-400 hover:text-amber-300 hover:underline"
                      >
                        Scroll to
                      </button>
                      <button
                        v-if="hasDetailPage(result)"
                        @click.stop="navigateToDetail(result)"
                        class="text-xs px-2 py-1 text-amber-400 hover:text-amber-300 hover:underline"
                      >
                        View Detail
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSearch } from '~/composables/useSearch'
import { handleSearchResultClick, getItemUrl, determineNavigationAction, scrollToItemInPage } from '~/utils/searchNavigation'
import type { SearchResult } from '~/utils/searchNavigation'

interface Props {
  show: boolean
  initialQuery?: string
  contextItems?: any[]
  contextSearchFields?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  initialQuery: '',
  contextItems: () => [],
  contextSearchFields: () => []
})

const emit = defineEmits(['update:show', 'close'])

const route = useRoute()
const modalRef = ref<HTMLElement | null>(null)
const localQuery = ref(props.initialQuery || '')
const selectedIndex = ref<{ column: 'site' | 'context', index: number } | null>(null)

const { siteResults, contextResults, isSearching, hasContext, performSearch, clearSearch } = useSearch()

// Clear search when modal closes
watch(() => props.show, (newVal) => {
  if (!newVal) {
    clearSearch()
    localQuery.value = ''
    selectedIndex.value = null
  }
})

// Watch for initial query changes
watch(() => props.initialQuery, (newVal) => {
  if (newVal !== localQuery.value) {
    localQuery.value = newVal
  }
})

// Watch local query and perform search
watch(localQuery, (newVal) => {
  if (props.show) {
    performSearch(newVal, props.contextItems, props.contextSearchFields)
  }
})

function handleInput() {
  selectedIndex.value = null
}

function handleClose() {
  emit('update:show', false)
  emit('close')
}

function handleResultClick(result: SearchResult, column: 'site' | 'context') {
  if (column === 'context') {
    // Try to scroll first, fallback to navigation
    const scrolled = scrollToItemInPage(result)
    if (!scrolled) {
      // If scroll failed, navigate to detail if available
      if (hasDetailPage(result)) {
        navigateToDetail(result)
      }
    }
    handleClose()
  } else {
    // Site-wide search: navigate to item
    const action = determineNavigationAction(result, route)
    handleSearchResultClick(result, route, action === 'scroll' ? 'scroll' : 'navigate')
    handleClose()
  }
}

function scrollToItem(result: SearchResult) {
  scrollToItemInPage(result)
  handleClose()
}

function navigateToDetail(result: SearchResult) {
  const url = getItemUrl(result, 'detail')
  navigateTo(url)
  handleClose()
}

function hasDetailPage(result: SearchResult): boolean {
  return result.type === 'track' || result.type === 'collection'
}

function getTypeLabel(type: SearchResult['type']): string {
  const labels = {
    software: 'Software',
    kit: 'Kit',
    track: 'Track',
    collection: 'Collection',
    user: 'User'
  }
  return labels[type] || 'Item'
}

function isSelected(column: 'site' | 'context', index: number): boolean {
  return selectedIndex.value?.column === column && selectedIndex.value?.index === index
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClose()
    return
  }

  if (event.key === 'Enter' && selectedIndex.value) {
    const { column, index } = selectedIndex.value
    const results = column === 'site' ? siteResults.value : contextResults.value
    if (results[index]) {
      handleResultClick(results[index], column)
    }
    return
  }

  // Arrow key navigation
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    navigateSelection(event.key === 'ArrowDown' ? 1 : -1)
  }
}

function navigateSelection(direction: number) {
  const totalSiteResults = siteResults.value.length
  const totalContextResults = hasContext.value ? contextResults.value.length : 0
  const totalResults = totalSiteResults + totalContextResults

  if (totalResults === 0) return

  if (!selectedIndex.value) {
    selectedIndex.value = { column: totalSiteResults > 0 ? 'site' : 'context', index: 0 }
    return
  }

  let { column, index } = selectedIndex.value

  if (column === 'site') {
    index += direction
    if (index < 0) {
      selectedIndex.value = null
    } else if (index >= totalSiteResults) {
      // Move to context column if it exists
      if (totalContextResults > 0) {
        selectedIndex.value = { column: 'context', index: 0 }
      } else {
        selectedIndex.value = { column: 'site', index: totalSiteResults - 1 }
      }
    } else {
      selectedIndex.value = { column: 'site', index }
    }
  } else {
    // context column
    index += direction
    if (index < 0) {
      // Move to site column if it exists
      if (totalSiteResults > 0) {
        selectedIndex.value = { column: 'site', index: totalSiteResults - 1 }
      } else {
        selectedIndex.value = null
      }
    } else if (index >= totalContextResults) {
      selectedIndex.value = { column: 'context', index: totalContextResults - 1 }
    } else {
      selectedIndex.value = { column: 'context', index }
    }
  }
}

// Close on click outside (handled by @click.self on backdrop)
// Close on escape key (handled in handleKeydown)

</script>

