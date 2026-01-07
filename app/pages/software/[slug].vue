<template>
  <div class="grid grid-cols-1 md:grid-cols-[250px_1fr] grow overflow-hidden">
    <div class="hidden md:flex border-r border-neutral-800 h-full overflow-y-auto">
      <div class="flex flex-col gap-0 w-full h-fit">
        <div v-if="softwareLoading" class="text-sm text-neutral-500">Loading…</div>
        <template v-else>
          <NuxtLink
            v-for="item in softwareList"
            :key="item.id"
            :to="`/software/${item.slug}`"
            class="text-sm transition-colors p-4 border-b border-neutral-800/30 last:border-b-0"
            :class="item.slug === slug 
              ? 'text-amber-400 bg-neutral-800/70 border-l-2 border-l-amber-400 font-bold sticky top-0 backdrop-blur-sm' 
              : 'text-neutral-500 hover:text-amber-400 hover:bg-neutral-800/30'"
          >
            {{ item.name }}
          </NuxtLink>
        </template>
      </div>
    </div>
    <ResourceDetailPage :type-slug="'software'" :slug="slug" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAsyncData } from '#app'
import { useSupabase } from '~/utils/supabase'
import ResourceDetailPage from '~/components/ResourceDetailPage.vue'

definePageMeta({
  key: (route) => `software-${route.params.slug}`
})

const route = useRoute()
const slug = computed(() => route.params.slug as string)

type SidebarSoftwareItem = {
  id: number
  name: string
  slug: string
}

type ResourceTypeRow = {
  id: number
}

const { supabase } = useSupabase()

const softwareSidebar = await useAsyncData<SidebarSoftwareItem[]>(
  'software-sidebar-list',
  async () => {
    if (!supabase) return []

    // Resolve software type id (don't hardcode)
    const { data: typeData, error: typeError } = await supabase
      .from('resource_types')
      .select('id')
      .eq('slug', 'software')
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
      console.error('Error fetching software sidebar list:', error)
      return []
    }

    return (data || []) as SidebarSoftwareItem[]
  },
  { server: true, default: () => [] }
)

const softwareLoading = softwareSidebar.pending
const softwareList = computed<SidebarSoftwareItem[]>(() => (softwareSidebar.data.value as unknown as SidebarSoftwareItem[]))
</script>

