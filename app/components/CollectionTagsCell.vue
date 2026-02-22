<template>
  <div class="flex flex-nowrap gap-1 items-center overflow-visible">
    <!-- 0 collections: slot (e.g. Plus button) or emptyText (e.g. "-") -->
    <template v-if="!collections || collections.length === 0">
      <slot name="empty">
        <span v-if="emptyText" class="text-neutral-400">{{ emptyText }}</span>
      </slot>
    </template>

    <!-- 1 collection: single tag link -->
    <template v-else-if="collections.length === 1">
      <NuxtLink
        :to="collectionLink(collections[0])"
        class="inline-flex items-center px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-200 hover:text-white whitespace-nowrap no-underline"
      >
        {{ collections[0].name }}
      </NuxtLink>
    </template>

    <!-- 2+ collections: first tag + +N dropdown -->
    <template v-else>
      <div ref="dropdownAnchorRef" class="relative flex gap-1 items-center shrink-0">
        <NuxtLink
          :to="collectionLink(collections[0])"
          class="inline-flex items-center px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-200 hover:text-white whitespace-nowrap no-underline"
        >
          {{ collections[0].name }}
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-200 hover:text-white whitespace-nowrap no-underline cursor-pointer border-0"
          :aria-expanded="dropdownOpen"
          @click.stop="toggleDropdown"
        >
          +{{ collections.length - 1 }}
        </button>
        <div
          v-if="dropdownOpen"
          :class="[
            'flex flex-col gap-1 absolute z-50 left-0 min-w-[120px] max-h-60 overflow-y-auto bg-neutral-800 border border-neutral-700 rounded-md shadow-lg p-1',
            openAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          ]"
        >
          <NuxtLink
            v-for="collection in remainingCollections"
            :key="collection.slug"
            :to="collectionLink(collection)"
            class="flex items-center px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-200 hover:text-white whitespace-nowrap no-underline w-full text-left"
            @click="closeDropdown"
          >
            {{ collection.name }}
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

export interface CollectionItem {
  name: string
  slug: string
}

const props = withDefaults(
  defineProps<{
    collections: CollectionItem[] | null | undefined
    ownerUsername: string
    /** Shown when 0 collections and no empty slot (e.g. "-") */
    emptyText?: string
  }>(),
  { emptyText: '' }
)

const dropdownAnchorRef = ref<HTMLElement | null>(null)
const dropdownOpen = ref(false)
const openAbove = ref(false)

const remainingCollections = computed(() => {
  if (!props.collections || props.collections.length <= 1) return []
  return props.collections.slice(1)
})

function collectionLink(collection: CollectionItem) {
  return `/u/${props.ownerUsername}/c/${collection.slug}`
}

const DROPDOWN_SPACE_THRESHOLD = 220

function toggleDropdown() {
  const wasOpen = dropdownOpen.value
  dropdownOpen.value = !dropdownOpen.value
  if (!wasOpen && dropdownOpen.value && dropdownAnchorRef.value) {
    nextTick(() => {
      if (!dropdownAnchorRef.value) return
      const rect = dropdownAnchorRef.value.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      openAbove.value = spaceBelow < DROPDOWN_SPACE_THRESHOLD
    })
  }
}

function closeDropdown() {
  dropdownOpen.value = false
  openAbove.value = false
}

function handleClickOutside(event: Event) {
  if (!dropdownOpen.value) return
  const target = event.target as Node
  if (dropdownAnchorRef.value && dropdownAnchorRef.value.contains(target)) return
  nextTick(() => {
    if (dropdownOpen.value) closeDropdown()
  })
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>
