<template>
  <PageContentSkeleton v-if="!pageShellReady" />
  <div v-else class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
    <LibraryHeader
      title="Producers"
      :count="filteredProducers.length"
      item-label="producer"
    />

    <div v-if="loadError" class="p-8 text-center text-neutral-500">
      {{ loadError }}
    </div>

    <div v-else-if="filteredProducers.length === 0" class="p-8 text-center text-neutral-500">
      {{ searchQuery ? 'No producers match your search.' : 'No public producers yet.' }}
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-neutral-800">
          <tr class="text-left text-neutral-500">
            <th class="p-4">Producer</th>
            <th class="p-4 hidden sm:table-cell">Bio</th>
            <th class="p-4 w-24">Tracks</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="producer in filteredProducers"
            :key="producer.id"
            class="border-b border-neutral-800/50 hover:bg-neutral-800/30"
          >
            <td class="p-4">
              <NuxtLink
                :to="`/u/${producer.username}`"
                class="text-amber-400 hover:text-amber-300 font-medium"
              >
                {{ producer.display_name || producer.username }}
              </NuxtLink>
              <p class="text-xs text-neutral-500 mt-0.5">@{{ producer.username }}</p>
            </td>
            <td class="p-4 text-neutral-400 hidden sm:table-cell max-w-md">
              <span class="line-clamp-2">{{ producer.bio || '—' }}</span>
            </td>
            <td class="p-4 text-neutral-400">
              {{ producer.track_count }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import LibraryHeader from '~/components/LibraryHeader.vue'
import PageContentSkeleton from '~/components/PageContentSkeleton.vue'
import { usePageShellReady } from '~/composables/usePageShellReady'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { markProducersVisited } from '~/composables/useOnboardingChecklist'

interface ProducerRow {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  track_count: number
}

const { supabase } = useSupabase()
const { user } = useAuth()
const producers = ref<ProducerRow[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const searchQuery = ref('')

const pageShellReady = computed(() => !loading.value)
usePageShellReady(pageShellReady)

const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')

const filteredProducers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return producers.value
  return producers.value.filter((p) => {
    const name = (p.display_name || '').toLowerCase()
    const username = (p.username || '').toLowerCase()
    const bio = (p.bio || '').toLowerCase()
    return name.includes(q) || username.includes(q) || bio.includes(q)
  })
})

const siteOrigin = useSiteOrigin()
const canonical = `${siteOrigin}/producers`
const seoTitle = 'Producers'
const seoDescription = 'Browse public audio producers on Beatbox and add their tracks to your shortlist.'

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: `${seoTitle} | Beatbox`,
  ogDescription: seoDescription,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: `${seoTitle} | Beatbox`,
  twitterDescription: seoDescription,
})

useHead({
  link: [{ rel: 'canonical', href: canonical, key: 'canonical' }],
})

async function fetchProducers() {
  if (!supabase) {
    loadError.value = 'Unable to load producers.'
    loading.value = false
    return
  }

  loading.value = true
  loadError.value = null

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, bio')
      .eq('user_type', 'audio_pro')
      .eq('is_public', true)
      .not('username', 'is', null)
      .order('display_name', { ascending: true })

    if (error) throw error

    const rows = (data || []).filter((row) => !!row.username) as Array<{
      id: string
      username: string
      display_name: string | null
      bio: string | null
    }>

    const withCounts = await Promise.all(
      rows.map(async (row) => {
        const { count } = await supabase
          .from('sounds')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', row.id)
          .eq('is_public', true)

        return {
          ...row,
          track_count: count || 0,
        }
      }),
    )

    producers.value = withCounts
  } catch (err: any) {
    console.error('Error fetching producers:', err)
    loadError.value = err?.message?.includes('is_public')
      ? 'Producer directory needs a database update. Try again shortly.'
      : 'Failed to load producers.'
    producers.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch(query: string) {
  searchQuery.value = query
}

onMounted(() => {
  markProducersVisited(user.value?.id)
  if (registerSearchHandler) {
    registerSearchHandler(handleSearch)
  }
  void fetchProducers()
})

onUnmounted(() => {
  if (unregisterSearchHandler) {
    unregisterSearchHandler()
  }
})

watch(
  () => user.value?.id,
  (id) => {
    if (id) markProducersVisited(id)
  },
)
</script>
