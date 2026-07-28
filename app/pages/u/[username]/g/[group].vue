<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow">
    <template v-if="!pageShellReady">
      <div class="p-4 border-b border-neutral-800">
        <div class="h-8 lg:h-10 w-48 max-w-full rounded bg-neutral-800 animate-pulse mb-2" />
        <div class="h-4 w-64 max-w-full rounded bg-neutral-800 animate-pulse" />
      </div>
      <TracksTableSkeleton :is-own-profile="isOwnProfile" :show-actions="!!(user || isOwnProfile)" />
    </template>

    <template v-else>
      <div class="p-4 border-b border-neutral-800">
        <div class="flex items-center justify-between mb-2">
          <div v-if="!isEditingGroupName" class="flex items-center gap-3 flex-1">
            <h1 class="text-lg lg:text-3xl font-bold truncate flex-1">{{ groupName }}</h1>
            <Button
              v-if="isOwnProfile"
              variant="ghost"
              class="!p-0 text-neutral-400 hover:text-white text-sm flex-shrink-0"
              title="Rename group"
              @click="isEditingGroupName = true"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Button>
          </div>
          <div v-else class="flex items-center gap-2 flex-1">
            <input v-model="newGroupName" type="text" class="input flex-1" placeholder="Enter new group name"
              @keyup.enter="saveGroupName" @keyup.esc="isEditingGroupName = false" />
            <Button size="sm" @click="saveGroupName">Save</Button>
            <Button variant="secondary" size="sm" @click="isEditingGroupName = false">Cancel</Button>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-neutral-400 text-sm">
            Grouped tracks/versions of similar recordings
          </p>
          <div class="flex items-center gap-4">
            <p v-if="tracksLoading" class="text-sm text-neutral-500">
              <span class="h-4 w-16 rounded bg-neutral-800 animate-pulse inline-block" />
            </p>
            <p v-else class="text-sm text-neutral-500">
              {{ totalTrackCount }} {{ totalTrackCount === 1 ? 'track' : 'tracks' }}
            </p>
            <div class="flex items-center gap-1">
              <Button
                variant="secondary"
                class="btn !px-3 !py-1.5 text-sm"
                :disabled="tracksLoading"
                @click="handleOpenFilterSort"
              >
                Filter & Sort
              </Button>
              <Button
                v-if="hasActiveFilterSort"
                variant="secondary"
                size="sm"
                class="btn px-2.5! py-1.5! text-sm shrink-0"
                title="Clear filters"
                @click="handleClearFilterSort"
              >
                <Xmark class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <StemPlayer v-if="tracks.length > 0" :tracks="tracks" />
      <div class="grow">
        <TracksTable
          :tracks="tracks"
          :source-id="`group-${groupName}`"
          :is-own-profile="isOwnProfile"
          :loading="tracksLoading"
          :has-more="hasMoreTracks"
          :loading-more="loadingMore"
          :username="username"
          @edit-track="handleEdit"
          @load-more="handleLoadMore"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch, type ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import TracksTable from '~/components/TracksTable.vue'
import TracksTableSkeleton from '~/components/TracksTableSkeleton.vue'
import StemPlayer from '~/components/StemPlayer.vue'
import { useFilterSortCookie } from '~/composables/useFilterSortPersistence'
import { Xmark } from '@iconoir/vue'
import { trackPageRange } from '~/utils/trackPagination'
import {
  applyMusicFiltersToSoundsQuery,
  type MusicFilterSortParams,
} from '~/utils/trackQueryFilters'
import { enrichTracksWithCollections } from '~/utils/trackCollectionEnrichment'
import { usePageShellReady } from '~/composables/usePageShellReady'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { supabase } = useSupabase()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

const registerContextItems = inject<(items: any[], fields: string[]) => void>('registerContextItems')
const unregisterContextItems = inject<() => void>('unregisterContextItems')
const registerFiltersAndSortHandler = inject<(handler: (params: any) => void) => void>('registerFiltersAndSortHandler')
const unregisterFiltersAndSortHandler = inject<() => void>('unregisterFiltersAndSortHandler')
const openFilterModal = inject<() => void>('openFilterModal')
const clearFilterSort = inject<(() => void) | null>('clearFilterSort', null)
const hasActiveFilterSort = inject<ComputedRef<boolean>>('hasActiveFilterSort', computed(() => false))
const musicFilterCookie = useFilterSortCookie('music')

const handleOpenFilterSort = () => {
  openFilterModal?.()
}

const handleClearFilterSort = () => {
  clearFilterSort?.()
}

const { data: initialData } = await useAsyncData(
  `group-${route.params.username}-${route.params.group}`,
  async () => {
    if (!supabase) return null

    const usernameParam = route.params.username as string
    const groupParam = route.params.group as string

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', usernameParam)
        .single()

      if (profileError || !profileData) return null

      const { data: tracksData, error: tracksError } = await supabase
        .from('sounds')
        .select('*')
        .eq('user_id', profileData.id)
        .eq('track_group_name', groupParam)
        .order('version', { ascending: false })
        .limit(10)

      if (tracksError) return null

      return {
        profileUserId: profileData.id,
        username: usernameParam,
        groupName: groupParam,
        tracks: tracksData || [],
      }
    } catch (error) {
      console.error('Error fetching group data:', error)
      return null
    }
  },
  { server: true }
)

const tracks = ref<any[]>([])
const totalTrackCount = ref(0)
const currentPage = ref(0)
const tracksLoading = ref(true)
const loadingMore = ref(false)
const lastAppliedParams = ref<MusicFilterSortParams | null>(null)
const profileUserId = ref<string | null>(initialData.value?.profileUserId || null)
const username = ref(initialData.value?.username || '')
const groupName = ref(initialData.value?.groupName || '')
const isEditingGroupName = ref(false)
const newGroupName = ref(initialData.value?.groupName || '')

const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

const pageShellReady = computed(() => !!profileUserId.value && !tracksLoading.value)
usePageShellReady(pageShellReady)

const hasMoreTracks = computed(() => tracks.value.length < totalTrackCount.value)

function resolveFilterParams(override?: MusicFilterSortParams): MusicFilterSortParams {
  if (override) return override
  if (lastAppliedParams.value) return lastAppliedParams.value
  const saved = musicFilterCookie.value
  if (saved && (saved.sort || saved.filters)) {
    return {
      filters: saved.filters || {},
      sort: saved.sort || { sortBy: 'version', sortDirection: 'desc' },
    }
  }
  return {
    filters: {},
    sort: { sortBy: 'version', sortDirection: 'desc' },
  }
}

const loadTracksPage = async (options: { page?: number; append?: boolean; params?: MusicFilterSortParams } = {}) => {
  if (!supabase || !profileUserId.value || !groupName.value) return

  const page = options.page ?? 0
  const append = options.append ?? false
  const params = resolveFilterParams(options.params)
  lastAppliedParams.value = params

  const sort = params.sort || { sortBy: 'version', sortDirection: 'desc' }
  const { from, to } = trackPageRange(page)

  if (append) {
    loadingMore.value = true
  } else {
    tracksLoading.value = true
    currentPage.value = 0
  }

  try {
    let query = supabase
      .from('sounds')
      .select(`
        *,
        track_statuses!status_id(id, name)
      `, { count: 'exact' })
      .eq('user_id', profileUserId.value)
      .eq('track_group_name', groupName.value)

    query = applyMusicFiltersToSoundsQuery(query, params.filters)
    query = query.order(sort.sortBy || 'version', { ascending: sort.sortDirection === 'asc' })
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    const enriched = await enrichTracksWithCollections(supabase, data || [])
    tracks.value = append ? [...tracks.value, ...enriched] : enriched
    totalTrackCount.value = count ?? enriched.length
    currentPage.value = page
  } catch (error) {
    console.error('Error loading group tracks:', error)
    if (!append) {
      tracks.value = []
      totalTrackCount.value = 0
    }
  } finally {
    tracksLoading.value = false
    loadingMore.value = false
  }
}

const fetchGroupTracks = async () => {
  const usernameParam = route.params.username as string
  const groupParam = route.params.group as string

  username.value = usernameParam
  groupName.value = groupParam
  newGroupName.value = groupParam

  if (!supabase) return

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', usernameParam)
      .single()

    if (profileError || !profileData) {
      tracksLoading.value = false
      return
    }

    profileUserId.value = profileData.id as string
    await loadTracksPage({ page: 0, append: false })
  } catch (error) {
    console.error('Error fetching group tracks:', error)
    tracksLoading.value = false
  }
}

const handleLoadMore = () => {
  if (loadingMore.value || tracksLoading.value || !hasMoreTracks.value) return
  void loadTracksPage({ page: currentPage.value + 1, append: true })
}

const updateFiltersAndSort = async (params: MusicFilterSortParams) => {
  await loadTracksPage({ page: 0, append: false, params })
}

const saveGroupName = async () => {
  if (!supabase || !newGroupName.value || newGroupName.value === groupName.value) {
    isEditingGroupName.value = false
    return
  }

  try {
    const { error } = await supabase
      .from('sounds')
      .update({ track_group_name: newGroupName.value })
      .eq('user_id', profileUserId.value)
      .eq('track_group_name', groupName.value)

    if (error) throw error
    router.push(`/u/${username.value}/g/${newGroupName.value}`)
  } catch (error) {
    console.error('Error renaming group:', error)
  } finally {
    isEditingGroupName.value = false
  }
}

const handleEdit = (track: any) => {
  window.dispatchEvent(new CustomEvent('edit-track', {
    detail: track,
    bubbles: true,
    composed: true,
  }))
}

const seoTitle = computed(() => {
  const groupUsername = initialData.value?.username || username.value
  const groupNameValue = initialData.value?.groupName || groupName.value
  if (groupNameValue && groupUsername) {
    return `${groupNameValue} by ${groupUsername}`
  }
  return 'Track Group'
})

const seoDescription = computed(() => {
  const groupUsername = initialData.value?.username || username.value
  const groupNameValue = initialData.value?.groupName || groupName.value
  const trackCount = initialData.value?.tracks?.length || totalTrackCount.value
  if (!groupNameValue || !groupUsername) {
    return 'View track group on Beatbox'
  }
  const countStr = trackCount > 0 ? ` - ${trackCount} tracks` : ''
  return `View different versions of ${groupNameValue} by ${groupUsername} on Beatbox${countStr}`
})

const seoUrl = computed(() => {
  const groupUsername = initialData.value?.username || username.value || route.params.username
  const groupNameValue = initialData.value?.groupName || groupName.value || route.params.group
  return `${siteUrl}/u/${groupUsername}/g/${groupNameValue}`
})

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogUrl: seoUrl,
  ogType: 'music.playlist',
  ogImage: `${siteUrl}/img/og-image.jpg`,
  ogImageWidth: '1200',
  ogImageHeight: '630',
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: `${siteUrl}/img/og-image.jpg`,
})

useHead({
  link: [{ rel: 'canonical', href: seoUrl }],
})

defineExpose({ updateFiltersAndSort })

const handleTrackUpdate = () => {
  fetchGroupTracks()
}

watch(() => tracks.value, (tracksList) => {
  if (registerContextItems && tracksList.length > 0) {
    registerContextItems(tracksList, ['title', 'artist'])
  }
}, { immediate: true, deep: true })

onMounted(async () => {
  await fetchGroupTracks()

  if (registerContextItems && tracks.value.length > 0) {
    registerContextItems(tracks.value, ['title', 'artist'])
  }

  registerFiltersAndSortHandler?.(updateFiltersAndSort)
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  unregisterContextItems?.()
  unregisterFiltersAndSortHandler?.()
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>
