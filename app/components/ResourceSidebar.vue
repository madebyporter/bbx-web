<template>
  <div ref="sidebarRef" class="hidden md:flex border-r border-neutral-800 h-full overflow-y-auto">
    <div class="flex flex-col gap-0 w-full h-fit">
      <div v-if="loading" class="text-sm text-neutral-500 p-4">Loading…</div>
      <template v-else>
        <NuxtLink
          v-for="item in items"
          :key="item.id"
          :to="`/${typeSlug}/${item.slug}`"
          class="text-sm transition-colors p-4 border-b border-neutral-800/30 last:border-b-0"
          :class="item.slug === currentSlug 
            ? 'text-amber-400 bg-neutral-800/70 border-l-2 border-l-amber-400 font-bold sticky top-0 backdrop-blur-sm' 
            : 'text-neutral-500 hover:text-amber-400 hover:bg-neutral-800/30'"
        >
          {{ item.name }}
        </NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAsyncData } from '#app'
import { useSupabase } from '~/utils/supabase'

const props = defineProps<{
  typeSlug: 'software' | 'kits'
  currentSlug: string
}>()

type SidebarItem = {
  id: number
  name: string
  slug: string
}

type ResourceTypeRow = {
  id: number
}

const route = useRoute()
const sidebarRef = ref<HTMLElement | null>(null)
const { supabase } = useSupabase()

// Use localStorage key for scroll position (unique per type)
const SCROLL_POSITION_KEY = computed(() => `${props.typeSlug}-sidebar-scroll`)

// Get saved scroll position from localStorage
const getSavedScrollPosition = (): number => {
  if (typeof window === 'undefined') return 0
  try {
    const saved = localStorage.getItem(SCROLL_POSITION_KEY.value)
    return saved ? parseInt(saved, 10) : 0
  } catch {
    return 0
  }
}

// Save scroll position to localStorage
const saveScrollPosition = (position: number) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SCROLL_POSITION_KEY.value, position.toString())
  } catch {
    // Ignore localStorage errors
  }
}

// Map typeSlug to database type slug ('kits' -> 'sounds')
const dbTypeSlug = computed(() => {
  return props.typeSlug === 'kits' ? 'sounds' : props.typeSlug
})

// Fetch sidebar items
const sidebar = await useAsyncData<SidebarItem[]>(
  `${props.typeSlug}-sidebar-list`,
  async () => {
    if (!supabase) return []

    // Resolve resource type id
    const { data: typeData, error: typeError } = await supabase
      .from('resource_types')
      .select('id')
      .eq('slug', dbTypeSlug.value)
      .single()

    const typeId = (typeData as unknown as ResourceTypeRow | null)?.id
    if (typeError || !typeId) return []

    const { data, error } = await supabase
      .from('resources')
      .select('id, name, slug')
      .eq('status', 'approved')
      .eq('type_id', typeId)
      .not('slug', 'is', null)
      .order('name', { ascending: true })

    if (error) {
      console.error(`Error fetching ${props.typeSlug} sidebar list:`, error)
      return []
    }

    return (data || []) as SidebarItem[]
  },
  { server: true, default: () => [] }
)

const loading = sidebar.pending
const items = computed<SidebarItem[]>(() => (sidebar.data.value as unknown as SidebarItem[]))

// Save scroll position whenever user scrolls
const handleSidebarScroll = () => {
  if (sidebarRef.value) {
    saveScrollPosition(sidebarRef.value.scrollTop)
  }
}

// Restore scroll position after route changes
watch(() => props.currentSlug, async () => {
  await nextTick()
  const savedPosition = getSavedScrollPosition()
  if (sidebarRef.value && savedPosition > 0) {
    // Use multiple requestAnimationFrame calls to ensure DOM is fully ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (sidebarRef.value) {
          sidebarRef.value.scrollTop = savedPosition
        }
      })
    })
  }
})

// Restore scroll position on mount
onMounted(() => {
  if (sidebarRef.value) {
    // Add scroll listener to save position
    sidebarRef.value.addEventListener('scroll', handleSidebarScroll, { passive: true })
    
    // Restore saved position if available
    const savedPosition = getSavedScrollPosition()
    if (savedPosition > 0) {
      // Use multiple requestAnimationFrame calls to ensure DOM is fully ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (sidebarRef.value) {
            sidebarRef.value.scrollTop = savedPosition
          }
        })
      })
    }
  }
})

// Cleanup scroll listener
onUnmounted(() => {
  if (sidebarRef.value) {
    sidebarRef.value.removeEventListener('scroll', handleSidebarScroll)
  }
})
</script>

