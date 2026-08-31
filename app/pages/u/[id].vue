<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow min-w-0">
    <template v-if="!pageShellReady">
      <ProfileHeaderSkeleton />
      <div class="grow min-w-0 overflow-x-hidden border-t border-neutral-800">
        <div class="flex flex-row justify-between items-center gap-4 p-4 border-b border-neutral-800">
          <div class="h-6 w-16 rounded bg-neutral-800 animate-pulse" />
          <div class="flex items-stretch gap-2">
            <div class="h-9 w-24 rounded bg-neutral-800 animate-pulse" />
          </div>
        </div>
        <TracksTableSkeleton
          :is-own-profile="isOwnProfile"
          :profile-user-type="profileUserType"
          :show-collection="skeletonShowCollection"
          :show-status="skeletonShowStatus"
          :show-actions="skeletonShowActions"
        />
      </div>
    </template>

    <template v-else>
    <!-- Profile Header -->
    <div class="flex flex-col md:flex-row justify-start md:justify-between items-stretch gap-2 p-4">
      <div class="flex flex-col gap-2 overflow-auto">
        <div class="flex flex-row gap-2 items-end flex-wrap">
          <h1 v-if="profileName" class="text-xl lg:text-3xl font-bold truncate">{{ profileName }}</h1>
          <span v-if="username" class="text-base lg:text-xl font-normal text-neutral-400">@{{ username }}</span>
        </div>
      </div>

      <!-- Section Toggles -->
      <PanelNav>
        <PanelNavItem :active="bioSectionOpen" @click="toggleBioSection">
          Bio
        </PanelNavItem>
        <PanelNavItem :active="collectionsSectionOpen" @click="toggleCollectionsSection">
          Collections
        </PanelNavItem>
        <PanelNavItem :active="softwareSectionOpen" @click="toggleSoftwareSection">
          Software
        </PanelNavItem>
        <PanelNavItem :active="musicSectionOpen" @click="toggleMusicSection">
          Music
        </PanelNavItem>
        <PanelNavItem
          v-if="isOwnProfile"
          :active="showLibrarySettingsDrawer"
          aria-label="Library settings"
          @click="showLibrarySettingsDrawer = true"
        >
          <Settings class="w-3.5 h-3.5" />
        </PanelNavItem>
      </PanelNav>
    </div>

    <!-- Bio Section -->
    <div v-if="bioSectionOpen" class="flex flex-col gap-0 p-4 border-t border-neutral-800">
      <div class="flex flex-col gap-1">
        <div v-if="profileBio" class="text-sm text-neutral-400">
          {{ profileBio }}
        </div>
        <p v-else-if="!isOwnProfile" class="text-sm text-neutral-500 italic">
          Something's supposed to be here
        </p>

        <div
          v-if="profileWebsite || profileHasSocialLinks"
          class="flex flex-row gap-2 text-sm text-neutral-400 flex-wrap items-center"
        >
          <a
            v-if="profileWebsite"
            :href="profileWebsite"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-neutral-300 transition-colors"
          >
            Website
          </a>

          <template v-for="platform in socialLinkPlatforms" :key="platform">
            <a
              v-if="profileSocialLinks[platform]"
              :href="String(profileSocialLinks[platform])"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-neutral-300 transition-colors"
            >
              {{ getDisplayNameFromUrl(String(profileSocialLinks[platform] || ''), platform) }}
            </a>
          </template>
        </div>
      </div>
    </div>

    <!-- Collections Section -->
    <div v-if="collectionsSectionOpen" class="flex flex-col gap-0 border-t border-neutral-800">
      <div class="flex flex-row gap-0">
        <div class="flex flex-row gap-2 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <div class="py-1 flex items-center justify-start whitespace-nowrap" v-if="loadingProfileCollections">
            Loading collections...
          </div>
          <div
            v-else-if="profileCollections.length > 0"
            class="flex flex-row items-end w-fit *:p-4 *:last:pr-4 *:pr-0"
          >
            <NuxtLink
              v-for="collection in profileCollections"
              :key="collection.id"
              :to="`/u/${username}/c/${collection.slug}`"
              class="flex flex-col gap-2 items-start justify-start w-fit whitespace-nowrap max-md:snap-center snap-start snap-always hover:opacity-90 transition-opacity"
            >
              <ArtworkMedia
                :path="collection.artwork_path"
                :provider="collection.artwork_provider"
                :entity-id="collection.id"
                kind="collection"
                size-class="size-40 md:size-48"
                :alt="`${collection.name} artwork`"
                wrapper-class="rounded-[2px]"
              />
              <div class="text-sm text-neutral-400">{{ collection.name }}</div>
            </NuxtLink>
          </div>
          <div class="p-4 flex items-center justify-start whitespace-nowrap text-sm text-neutral-400" v-else-if="isOwnProfile">
            Mark a collection as Show on Profile in its Collection Settings to display it here.
          </div>
        </div>
      </div>
    </div>

    <!-- Software Section -->
    <div v-if="softwareSectionOpen" class="flex flex-col gap-0 border-t border-neutral-800">
      <div v-if="!loadingSoftware && softwareList.length > 0"
        class="p-2 max-md:pb-0 flex flex-row gap-2 text-xs overflow-x-auto no-scrollbar">
        <div @click="clearFilters" :class="[
            'rounded-full px-4 py-2 flex items-start justify-start whitespace-nowrap cursor-pointer transition-colors select-none',
            selectedTags.length === 0 
              ? 'bg-neutral-800' 
              : 'bg-transparent hover:bg-neutral-800/50'
          ]">
          All Software
        </div>
        <div v-for="tag in availableTags" :key="tag" @click="toggleTag(tag)" :class="[
            'rounded-full px-4 py-2 flex items-start justify-start whitespace-nowrap cursor-pointer transition-colors select-none',
            isTagSelected(tag)
              ? 'bg-neutral-800'
              : 'bg-transparent hover:bg-neutral-800/50'
          ]">
          {{ tag }}
        </div>
      </div>
      <div class="flex flex-row gap-0">
        <div class="flex flex-row gap-2 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <div class="py-1 flex items-center justify-start whitespace-nowrap" v-if="loadingSoftware">
            Loading software...
          </div>
          <div ref="softwareContainer" class="flex flex-row items-end w-fit *:p-4 *:last:pr-4 *:pr-0"
            v-else-if="softwareList.length > 0">
            <div
              class="flex flex-col gap-2 items-start justify-start w-fit whitespace-nowrap max-md:snap-center snap-start snap-always"
              v-for="software in softwareList" :key="software.id">
              <img :src="getSoftwareImageUrl(software.image_url)" :alt="software.name"
                class="software-image min-w-64 max-w-64 md:min-w-72 md:max-w-72 h-auto object-contain object-top-left rounded-[2px]"
                @error="(e) => { (e.target as HTMLImageElement).src = '/img/placeholder.png' }" />
              <div class="software-name text-sm text-neutral-400">{{ software.name }}</div>
            </div>
          </div>
          <div class="p-4 flex items-center justify-start whitespace-nowrap text-sm text-neutral-400" v-else>
            <span v-if="isOwnProfile">
              <NuxtLink to="/software" class="hover:text-amber-400 transition-colors">
                Add some software to your profile
              </NuxtLink>
            </span>
            <span v-else>
              This producer doesn't have any software listed yet.
            </span>
          </div>
        </div>
      </div>
    </div>
    <!-- Tracks Section -->
    <div v-if="musicSectionOpen" class="grow min-w-0 overflow-x-hidden border-t border-neutral-800">
      <div class="flex flex-row justify-between items-center gap-4 p-4 border-b border-neutral-800">
        <div class="flex flex-col overflow-auto">
          <h2 class="text-lg lg:text-xl font-bold truncate">Music</h2>
        </div>
        <div class="flex items-stretch gap-2">
          <p v-if="loading" class="text-sm text-neutral-500 flex items-center">
            <span class="h-4 w-16 rounded bg-neutral-800 animate-pulse inline-block" />
          </p>
          <p v-else class="text-sm text-neutral-500 flex items-center">
            {{ totalTrackCount }} {{ totalTrackCount === 1 ? 'track' : 'tracks' }}
          </p>
          <div id="ui_filter" class="flex items-stretch gap-px group/filter">
            <Button
              variant="secondary"
              size="sm"
              class="btn px-3! py-1.5! text-sm h-full max-h-10 self-stretch group-hover/filter:bg-neutral-600"
              :disabled="loading"
              @click="handleOpenFilterSort"
            >
              Filter & Sort
            </Button>
            <Button
              v-if="hasActiveFilterSort"
              variant="secondary"
              size="sm"
              class="btn px-2.5! py-1.5! text-sm h-full max-h-10 self-stretch shrink-0 group-hover/filter:bg-neutral-600"
              title="Clear filters"
              @click="handleClearFilterSort"
            >
              <Xmark class="w-4 h-4" />
            </Button>
          </div>
          <Button
            v-if="isOwnProfile && isAudioPro"
            variant="secondary"
            size="sm"
            :class="[
              'btn px-2.5! py-1.5! text-sm h-full max-h-10 self-stretch shrink-0',
              analyticsMode ? 'border! border-amber-400/60! bg-amber-400/10! text-amber-300!' : ''
            ]"
            title="Analytics"
            @click="toggleAnalyticsMode"
          >
            <StatsReport class="w-4 h-4" />
          </Button>
        </div>
      </div>
      <template v-if="analyticsMode && isOwnProfile && isAudioPro">
        <TrackAnalyticsDateFilter v-model="analyticsRangeLabel" />
        <TrackAnalyticsSummary
          :summary="analyticsSummary"
          :top-track-title="topTrackTitle"
          :loading="analyticsLoading"
        />
      </template>
      <TracksTable
        :tracks="filteredTracks"
        :source-id="`profile-${profileUserId}`"
        :is-own-profile="isOwnProfile"
        :loading="loading"
        :has-more="hasMoreTracks"
        :loading-more="loadingMore"
        :username="username"
        :viewer-user-type="viewerUserType"
        :profile-user-type="profileUserType"
        :analytics-mode="analyticsMode"
        :track-stats="trackStats"
        :analytics-loading="analyticsLoading"
        @edit-track="handleEdit"
        @tracks-deleted="fetchTracks"
        @track-shortlisted="handleTrackShortlisted"
        @track-unshortlisted="handleTrackUnshortlisted"
        @load-more="handleLoadMore"
      />
    </div>
    </template>

    <LibrarySettingsDrawer
      v-if="profileUserId && isOwnProfile"
      v-model:show="showLibrarySettingsDrawer"
      :profile-id="profileUserId"
      :is-audio-pro="isAudioPro"
      :panels="profilePanels"
      :display-name="profileName"
      :username="username"
      :bio="profileBio"
      :website="profileWebsite"
      :social-links="profileSocialLinks"
      @panels-updated="handlePanelsUpdated"
      @profile-updated="handleProfileUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, onUnmounted, inject, watch, nextTick, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import { getTrackVisibilityCondition } from '~/utils/trackVisibility'
import TracksTable from '~/components/TracksTable.vue'
import TracksTableSkeleton from '~/components/TracksTableSkeleton.vue'
import ProfileHeaderSkeleton from '~/components/ProfileHeaderSkeleton.vue'
import LibrarySettingsDrawer from '~/components/LibrarySettingsDrawer.vue'
import ArtworkMedia from '~/components/ArtworkMedia.vue'
import TrackAnalyticsDateFilter from '~/components/TrackAnalyticsDateFilter.vue'
import TrackAnalyticsSummary from '~/components/TrackAnalyticsSummary.vue'
import { recordPageView } from '~/composables/useTrackAnalytics'
import { useAnalytics } from '~/composables/useAnalytics'
import {
  loadStoredAnalyticsRangeLabel,
  useTrackAnalyticsData,
} from '~/composables/useTrackAnalyticsData'
import { useFilterSortCookie, resolveStoredFilterSortParams } from '~/composables/useFilterSortPersistence'
import { getUniqueGroupTracks } from '~/utils/uniqueGroupShuffle'
import { usePlayer } from '~/composables/usePlayer'
import { trackPageRange } from '~/utils/trackPagination'
import {
  applyMusicFiltersToSoundsQuery,
  needsClientOnlyPagination,
  type MusicFilterSortParams,
} from '~/utils/trackQueryFilters'
import {
  enrichTracksWithCollections,
  type TrackWithCollections,
} from '~/utils/trackCollectionEnrichment'
import type { Track } from '~/types/track'
import {
  DEFAULT_PROFILE_PANELS,
  loadStoredPanelOpenState,
  normalizeProfilePanels,
  saveStoredPanelOpenState,
  type ProfilePanels,
} from '~/utils/profilePanels'
import {
  getDisplayNameFromUrl,
  hasSocialLinks,
  SOCIAL_PLATFORMS,
} from '~/utils/profileFields'
import { prefetchArtworkUrls } from '~/composables/useArtworkUrlCache'
import gsap from 'gsap'
import { Xmark, StatsReport, Settings } from '@iconoir/vue'
const route = useRoute()
const { user, isReady } = useAuth()
const { supabase } = useSupabase()
const { updateQueue, queueSourceId } = usePlayer()
const config = useRuntimeConfig()
const siteUrl = 'https://beatbox.studio'

// Inject context items and filter/sort handler registration functions
const registerContextItems = inject<(items: any[], fields: string[]) => void>('registerContextItems')
const unregisterContextItems = inject<() => void>('unregisterContextItems')
const registerFiltersAndSortHandler = inject<(handler: (params: any) => void) => void>('registerFiltersAndSortHandler')
const unregisterFiltersAndSortHandler = inject<() => void>('unregisterFiltersAndSortHandler')
const openFilterModal = inject<() => void>('openFilterModal')
const clearFilterSort = inject<(() => void) | null>('clearFilterSort', null)
const hasActiveFilterSort = inject<ComputedRef<boolean>>('hasActiveFilterSort', computed(() => false))
const musicFilterCookie = useFilterSortCookie('music')

// Fetch initial profile data server-side for SEO
const { data: initialData, refresh: refreshInitialData } = await useAsyncData(
  `profile-${route.params.id}`,
  async () => {
    if (!supabase) return null
    
    const usernameOrId = route.params.id as string
    
    try {
      // Check if it's a UUID (36 chars with hyphens) or username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId)
      
      let data, error
      
      if (isUUID) {
        // Try to fetch by ID first
        const result = await supabase
          .from('user_profiles')
          .select('id, username, display_name, bio, website, social_links, user_type, profile_panels')
          .eq('id', usernameOrId)
          .single()
        data = result.data
        error = result.error
      } else {
        // Try to fetch by username
        const result = await supabase
          .from('user_profiles')
          .select('id, username, display_name, bio, website, social_links, user_type, profile_panels')
          .eq('username', usernameOrId)
          .single()
        data = result.data
        error = result.error
      }

      // If username lookup failed and it's not a UUID, try by ID as fallback
      if ((error || !data) && !isUUID) {
        const result = await supabase
          .from('user_profiles')
          .select('id, username, display_name, bio, website, social_links, user_type, profile_panels')
          .eq('id', usernameOrId)
          .single()
        data = result.data
        error = result.error
      }

      if (error || !data) return null
      
      // Fetch initial tracks for SEO (just first 10, only public tracks)
      const { data: tracksData } = await supabase
        .from('sounds')
        .select('*')
        .eq('user_id', data.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10)
      
      return {
        profile: data,
        tracks: tracksData || []
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  },
  {
    server: true // Ensure this runs on the server for SSR
  }
)

// PHASE 2: Server-side logging to verify data availability
if (process.server) {
}

// Fetch software data with caching
// Wait for initialData to be available before fetching
const { data: softwareData, refresh: refreshSoftware } = await useAsyncData(
  `software-${route.params.id}`,
  async () => {
    if (!supabase) return []
    
    // Wait for initialData to be available
    const profileId = initialData.value?.profile?.id
    if (!profileId) return []
    
    try {
      // First, get the software type_id
      const { data: typeData, error: typeError } = await supabase
        .from('resource_types')
        .select('id')
        .eq('slug', 'software')
        .single()
      
      if (typeError || !typeData) {
        console.error('Error finding software type:', typeError)
        return []
      }
      
      // Then fetch user_resources with resources filtered by type_id, including tags
      const { data, error } = await supabase
        .from('user_resources')
        .select(`
          resource_id,
          resources!inner (
            id,
            name,
            image_url,
            type_id,
            resource_tags (
              tags (
                name
              )
            )
          )
        `)
        .eq('user_id', profileId)
        .eq('resources.type_id', typeData.id)
      
      if (error) throw error
      
      return (data || [])
        .map((item: any) => {
          const resource = item.resources
          if (!resource) return null
          // Extract tags from nested structure
          const tags = resource.resource_tags?.map((rt: any) => rt.tags?.name).filter(Boolean) || []
          return {
            ...resource,
            tags
          }
        })
        .filter((resource: any) => resource !== null)
    } catch (error) {
      console.error('Error fetching software:', error)
      return []
    }
  },
  {
    default: () => [],
    lazy: true
  }
)

// State
const profileName = ref<string>(initialData.value?.profile?.display_name || initialData.value?.profile?.username || '')
const username = ref<string>(initialData.value?.profile?.username || '')
const profileUserId = ref<string | null>(initialData.value?.profile?.id || null)
const profileUserType = ref<'creator' | 'audio_pro' | null>((initialData.value?.profile?.user_type as 'creator' | 'audio_pro') || null)
const viewerUserType = ref<'creator' | 'audio_pro' | null>(null) // Logged-in user's type
const profileBio = ref<string>((initialData.value?.profile?.bio as string) || '')
const profileWebsite = ref<string>((initialData.value?.profile?.website as string) || '')
const profileSocialLinks = ref<{
  twitter?: string
  instagram?: string
  soundcloud?: string
  spotify?: string
  youtube?: string
  linkedin?: string
  [key: string]: string | undefined
}>((initialData.value?.profile?.social_links as any) || {})
const profilePanels = ref<ProfilePanels>(
  normalizeProfilePanels(initialData.value?.profile?.profile_panels ?? DEFAULT_PROFILE_PANELS),
)
const showLibrarySettingsDrawer = ref(false)
const profileCollections = ref<Array<{
  id: number
  name: string
  slug: string
  artwork_path?: string | null
  artwork_provider?: string | null
}>>([])
const loadingProfileCollections = ref(false)
const tracks = ref<TrackWithCollections[]>([])
const totalTrackCount = ref(0)
const currentPage = ref(0)
const loadingMore = ref(false)
const clientTrackCache = ref<TrackWithCollections[] | null>(null)
const lastAppliedParams = ref<{ filters: any; sort: any } | null>(null)
const loading = ref(true)
// searchQuery removed - search is now handled by SearchModal
const allSoftware = computed(() => softwareData.value || [])
const loadingSoftware = computed(() => softwareData.value === null)

// Panel open state: DB defaults on first visit; localStorage persists visitor toggles
const bioSectionOpen = ref(DEFAULT_PROFILE_PANELS.bio)
const collectionsSectionOpen = ref(DEFAULT_PROFILE_PANELS.collections)
const softwareSectionOpen = ref(DEFAULT_PROFILE_PANELS.software)
const musicSectionOpen = ref(DEFAULT_PROFILE_PANELS.music)

const applyPanelOpenState = (panels: ProfilePanels) => {
  const normalized = normalizeProfilePanels(panels)
  bioSectionOpen.value = normalized.bio
  collectionsSectionOpen.value = normalized.collections
  softwareSectionOpen.value = normalized.software
  musicSectionOpen.value = normalized.music
}

const persistPanelOpenState = () => {
  if (!profileUserId.value) return
  saveStoredPanelOpenState(profileUserId.value, {
    bio: bioSectionOpen.value,
    collections: collectionsSectionOpen.value,
    software: softwareSectionOpen.value,
    music: musicSectionOpen.value,
  })
}

const loadPanelOpenState = () => {
  if (!profileUserId.value) return
  const stored = loadStoredPanelOpenState(profileUserId.value)
  if (stored) {
    applyPanelOpenState(stored)
    return
  }
  applyPanelOpenState(profilePanels.value)
}

const syncProfilePanels = (panels: ProfilePanels) => {
  profilePanels.value = normalizeProfilePanels(panels)
}

const handlePanelsUpdated = (panels: ProfilePanels) => {
  syncProfilePanels(panels)
}

const toggleBioSection = () => {
  bioSectionOpen.value = !bioSectionOpen.value
  persistPanelOpenState()
}

const toggleCollectionsSection = () => {
  collectionsSectionOpen.value = !collectionsSectionOpen.value
  persistPanelOpenState()
}

const toggleSoftwareSection = () => {
  softwareSectionOpen.value = !softwareSectionOpen.value
  persistPanelOpenState()
}

const toggleMusicSection = () => {
  musicSectionOpen.value = !musicSectionOpen.value
  persistPanelOpenState()
}

// Check if software is available
const hasSoftware = computed(() => {
  return !loadingSoftware.value && allSoftware.value.length > 0
})

// Filter state
const selectedTags = ref<string[]>([])

// Extract unique tags from all software
const availableTags = computed(() => {
  const tagSet = new Set<string>()
  allSoftware.value.forEach((software: any) => {
    if (software.tags && Array.isArray(software.tags)) {
      software.tags.forEach((tag: string) => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
})

// Filter software based on selected tags (OR logic - must have ANY of the selected tags)
// Also sort alphabetically by name
const softwareList = computed(() => {
  let filtered: any[] = []
  
  if (selectedTags.value.length === 0) {
    filtered = allSoftware.value
  } else {
    filtered = allSoftware.value.filter((software: any) => {
      const softwareTags = software.tags || []
      // Check if software has ANY of the selected tags
      return selectedTags.value.some(tag => softwareTags.includes(tag))
    })
  }
  
  // Sort alphabetically by name
  return filtered.sort((a: any, b: any) => {
    const nameA = (a.name || '').toLowerCase()
    const nameB = (b.name || '').toLowerCase()
    return nameA.localeCompare(nameB)
  })
})

// Toggle tag selection
const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

// Clear all filters (show all software)
const clearFilters = () => {
  selectedTags.value = []
}

// Check if tag is selected
const isTagSelected = (tag: string) => {
  return selectedTags.value.includes(tag)
}

const socialLinkPlatforms = SOCIAL_PLATFORMS

const profileHasSocialLinks = computed(() => hasSocialLinks(profileSocialLinks.value))

type ProfileUpdatedPayload = {
  displayName: string
  username: string
  bio: string
  website: string
  socialLinks: Record<string, string>
}

const handleProfileUpdated = async (payload: ProfileUpdatedPayload) => {
  profileName.value = payload.displayName || payload.username || ''
  username.value = payload.username || ''
  profileBio.value = payload.bio || ''
  profileWebsite.value = payload.website || ''
  profileSocialLinks.value = payload.socialLinks as any
  await refreshInitialData()
}

// GSAP animation refs
const softwareContainer = ref<HTMLDivElement | null>(null)

// Animate software items when list changes
watch(softwareList, async () => {
  if (!softwareContainer.value || softwareList.value.length === 0) return
  
  await nextTick()
  
  // Get all images and text elements
  const images = softwareContainer.value.querySelectorAll('.software-image')
  const names = softwareContainer.value.querySelectorAll('.software-name')
  
  // Set initial opacity to 0
  gsap.set([...images, ...names], { opacity: 0 })
  
  // Fade in images first
  gsap.to(images, {
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out',
    stagger: 0.05
  })
  
  // Fade in text 0.1s later
  gsap.to(names, {
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out',
    stagger: 0.05,
    delay: 0.1
  })
}, { immediate: true })

// Computed
const isOwnProfile = computed(() => {
  // Only return true if we have both user and profileUserId, and they match exactly
  // This ensures we're comparing the actual profile owner, not just route params
  // (route params could be username, not ID)
  if (!user.value || !profileUserId.value) {
    return false
  }
  // Explicit string comparison to ensure exact match
  return String(user.value.id) === String(profileUserId.value)
})

// Check if current profile is audio_pro (for showing Members feature)
const isAudioPro = computed(() => {
  return profileUserType.value === 'audio_pro'
})

const pageShellReady = computed(() => isReady.value && !!profileUserId.value && !loading.value)
usePageShellReady(pageShellReady)

const skeletonShowCollection = computed(
  () =>
    !analyticsMode.value &&
    (isOwnProfile.value || (!isReady.value && profileUserType.value === 'audio_pro'))
)
const skeletonShowStatus = computed(
  () =>
    !analyticsMode.value &&
    profileUserType.value === 'audio_pro' &&
    (isOwnProfile.value || !isReady.value)
)
const skeletonShowActions = computed(
  () =>
    !isReady.value ||
    !!(
      user.value ||
      isOwnProfile.value ||
      (viewerUserType.value === 'creator' && profileUserType.value === 'audio_pro')
    )
)

// Fetch viewer's user type when user is logged in
const fetchViewerUserType = async () => {
  if (!user.value || !supabase) return
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching viewer user type:', error)
      return
    }
    
    if (data) {
      viewerUserType.value = (data.user_type as 'creator' | 'audio_pro') || null
    } else {
      viewerUserType.value = null
    }
  } catch (error) {
    console.error('Error fetching viewer user type:', error)
    viewerUserType.value = null
  }
}

// Watch for user becoming available to fetch viewer user type
watch(() => user.value, async (newUser) => {
  if (newUser) {
    await fetchViewerUserType()
  } else {
    viewerUserType.value = null
  }
}, { immediate: true })

// filteredTracks now just returns tracks (search is handled by SearchModal)
const filteredTracks = computed(() => {
  return tracks.value
})

const analyticsMode = ref(false)
const { capture } = useAnalytics()

const toggleAnalyticsMode = () => {
  const enabled = !analyticsMode.value
  analyticsMode.value = enabled
  capture('analytics_mode_toggled', { enabled, page: 'profile' })
}
const analyticsRangeLabel = ref(loadStoredAnalyticsRangeLabel())
const analyticsTrackIds = computed(() => filteredTracks.value.map(track => track.id))

const {
  loading: analyticsLoading,
  trackStats,
  summary: analyticsSummary,
} = useTrackAnalyticsData({
  trackIds: analyticsTrackIds,
  enabled: computed(() => analyticsMode.value && isOwnProfile.value && isAudioPro.value),
  rangeLabel: analyticsRangeLabel,
})

const topTrackTitle = computed(() => {
  const topId = analyticsSummary.value.topTrackId
  if (!topId) return null
  return filteredTracks.value.find(track => track.id === topId)?.title ?? `Track #${topId}`
})

// Watch tracks to update context items for search
watch(() => tracks.value, (tracksList) => {
  if (registerContextItems && tracksList && tracksList.length > 0) {
    // For tracks, search by title and artist
    registerContextItems(tracksList, ['title', 'artist'])
  }
}, { immediate: true, deep: true })

// Helper function to get image URL for software
const getSoftwareImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '/img/placeholder.png'
  if (imageUrl.startsWith('http')) return imageUrl
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return '/img/placeholder.png'
  return `${supabaseUrl}/storage/v1/object/public/resource-images/${imageUrl}`
}

// Keep profile state in sync when async data resolves after client navigation
watch(initialData, (data) => {
  if (!data?.profile) return
  profileUserId.value = data.profile.id
  profileName.value = data.profile.display_name || data.profile.username || ''
  username.value = data.profile.username || ''
  profileUserType.value = (data.profile.user_type as 'creator' | 'audio_pro') || null
  profileBio.value = data.profile.bio || ''
  profileWebsite.value = data.profile.website || ''
  profileSocialLinks.value = (data.profile.social_links as any) || {}
  syncProfilePanels(normalizeProfilePanels(data.profile.profile_panels))
  loadPanelOpenState()
}, { deep: true })

watch(collectionsSectionOpen, (open) => {
  if (open) {
    void fetchProfileCollections()
  }
})

watch(profileUserId, (profileId, previousId) => {
  if (profileId && profileId !== previousId) {
    loadPanelOpenState()
    void fetchProfileCollections()
  }
})

// Methods - Keep fetchProfile for backwards compatibility but simplified
const fetchProfile = async () => {
  // Profile already loaded server-side, just ensure values are set
  if (!profileUserId.value && initialData.value?.profile) {
    profileUserId.value = initialData.value.profile.id
      profileName.value = initialData.value.profile.display_name || initialData.value.profile.username || ''
      username.value = initialData.value.profile.username || ''
      profileUserType.value = (initialData.value.profile.user_type as 'creator' | 'audio_pro' | null) || null
      profileBio.value = initialData.value.profile.bio || ''
      profileWebsite.value = initialData.value.profile.website || ''
      profileSocialLinks.value = (initialData.value.profile.social_links as any) || {}
      syncProfilePanels(normalizeProfilePanels(initialData.value.profile.profile_panels))
      loadPanelOpenState()
  } else if (!profileUserId.value && supabase && user.value) {
    // If profile wasn't loaded server-side, try to fetch it client-side
    // This handles cases where the route param is a UUID
    const usernameOrId = route.params.id as string
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId)
    
    try {
      let result
      if (isUUID) {
        result = await supabase
          .from('user_profiles')
          .select('id, username, display_name, bio, website, social_links, user_type, profile_panels')
          .eq('id', usernameOrId)
          .single()
      } else {
        result = await supabase
          .from('user_profiles')
          .select('id, username, display_name, bio, website, social_links, user_type, profile_panels')
          .eq('username', usernameOrId)
          .single()
      }
      
      if (result.data && !result.error) {
        profileUserId.value = result.data.id
        profileName.value = result.data.display_name || result.data.username || ''
        username.value = result.data.username || ''
        profileUserType.value = (result.data.user_type as 'creator' | 'audio_pro') || null
        profileBio.value = result.data.bio || ''
        profileWebsite.value = result.data.website || ''
        profileSocialLinks.value = (result.data.social_links as any) || {}
        syncProfilePanels(normalizeProfilePanels(result.data.profile_panels))
        loadPanelOpenState()
      }
    } catch (error) {
      console.error('Error fetching profile client-side:', error)
    }
  }
}

const fetchProfileCollections = async () => {
  if (!supabase || !profileUserId.value) {
    profileCollections.value = []
    return
  }

  loadingProfileCollections.value = true
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, slug, artwork_path, artwork_provider, show_on_profile')
      .eq('user_id', profileUserId.value)
      .eq('show_on_profile', true)
      .order('name', { ascending: true })

    if (error) throw error

    profileCollections.value = (data || []).map((collection: any) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      artwork_path: collection.artwork_path,
      artwork_provider: collection.artwork_provider,
    }))

    void prefetchArtworkUrls(
      profileCollections.value.map((collection) => ({
        id: collection.id,
        artwork_path: collection.artwork_path,
        artwork_provider: collection.artwork_provider as 'supabase' | 'r2' | null | undefined,
      })),
      'collection',
      supabase,
    )
  } catch (error) {
    console.error('Error fetching profile collections:', error)
    profileCollections.value = []
  } finally {
    loadingProfileCollections.value = false
  }
}

// fetchSoftware is now handled by useAsyncData with caching
// Use refreshSoftware() if you need to manually refresh
const fetchSoftware = async () => {
  await refreshSoftware()
}

let fetchTracksRequestId = 0

const hasMoreTracks = computed(() => tracks.value.length < totalTrackCount.value)

function resolveFilterParams(override?: MusicFilterSortParams): MusicFilterSortParams {
  if (override) return override
  if (lastAppliedParams.value) return lastAppliedParams.value
  return resolveStoredFilterSortParams(musicFilterCookie.value)
}

function isShortlistMode() {
  return !!(isOwnProfile.value && viewerUserType.value === 'creator' && user.value)
}

function applySortToTracks(arr: Track[], sort: MusicFilterSortParams['sort']) {
  const sortBy = sort?.sortBy || 'created_at'
  const sortDirection = sort?.sortDirection || 'desc'
  if (sortBy === 'created_at') {
    arr.sort((a, b) => {
      const aTime = new Date(String(a.shortlisted_at || a.created_at || 0)).getTime()
      const bTime = new Date(String(b.shortlisted_at || b.created_at || 0)).getTime()
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime
    })
  } else {
    arr.sort((a, b) => {
      const aVal = a[sortBy] ?? ''
      const bVal = b[sortBy] ?? ''
      if (sortDirection === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
    })
  }
}

async function fetchFullTrackList(params: MusicFilterSortParams): Promise<TrackWithCollections[]> {
  if (!supabase || !profileUserId.value) return []

  const sort = params.sort || { sortBy: 'created_at', sortDirection: 'desc' }

  if (isShortlistMode()) {
    const { getShortlistedTracks } = await import('~/utils/shortlist')
    const result = await getShortlistedTracks(user.value!.id)
    if (result.error) throw result.error
    const data = [...(result.data || [])] as Track[]
    applySortToTracks(data, sort)
    return enrichTracksWithCollections(supabase, data, { collectionOwnerId: user.value!.id })
  }

  let query = supabase
    .from('sounds')
    .select(`
      *,
      track_statuses!status_id(id, name)
    `)
    .eq('user_id', profileUserId.value)

  query = applyMusicFiltersToSoundsQuery(query, params.filters)
  query = query.order(sort.sortBy || 'created_at', { ascending: sort.sortDirection === 'asc' })

  const { data, error } = await query
  if (error) throw error
  return enrichTracksWithCollections(supabase, (data || []) as unknown as Track[])
}

async function fetchServerTrackPage(params: MusicFilterSortParams, page: number) {
  if (!supabase || !profileUserId.value) return { tracks: [] as TrackWithCollections[], count: 0 }

  const sort = params.sort || { sortBy: 'created_at', sortDirection: 'desc' }
  const { from, to } = trackPageRange(page)

  let query = supabase
    .from('sounds')
    .select(`
      *,
      track_statuses!status_id(id, name)
    `, { count: 'exact' })
    .eq('user_id', profileUserId.value)

  query = applyMusicFiltersToSoundsQuery(query, params.filters)
  query = query.order(sort.sortBy || 'created_at', { ascending: sort.sortDirection === 'asc' })
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  const enriched = await enrichTracksWithCollections(supabase, (data || []) as unknown as Track[])
  return { tracks: enriched, count: count ?? enriched.length }
}

function applyLatestVersionOnlyFilter<T extends Track>(list: T[]): T[] {
  const keepIds = new Set(getUniqueGroupTracks(list).map((t) => t.id))
  return list.filter((t) => keepIds.has(t.id))
}

const loadTracksPage = async (options: {
  page?: number
  append?: boolean
  params?: MusicFilterSortParams
} = {}) => {
  if (!supabase || !profileUserId.value) {
    return
  }

  const page = options.page ?? 0
  const append = options.append ?? false
  const params = resolveFilterParams(options.params)

  lastAppliedParams.value = {
    filters: { ...(params.filters || {}) },
    sort: { ...(params.sort || { sortBy: 'created_at', sortDirection: 'desc' }) },
  }

  const requestId = ++fetchTracksRequestId
  getTrackVisibilityCondition(profileUserId.value, user.value?.id ?? null).catch(() => {})

  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    currentPage.value = 0
    clientTrackCache.value = null
  }

  try {
    if (isOwnProfile.value && user.value && !viewerUserType.value) {
      await fetchViewerUserType()
    }

    const useClientPagination = isShortlistMode() || needsClientOnlyPagination(params)

    if (useClientPagination) {
      if (!clientTrackCache.value) {
        let fullList = await fetchFullTrackList(params)
        if (params.filters?.latestVersionOnly) {
          fullList = applyLatestVersionOnlyFilter(fullList)
          const sourceId = `profile-${profileUserId.value}`
          if (queueSourceId.value === sourceId) {
            updateQueue(fullList, sourceId)
          }
        }
        clientTrackCache.value = fullList
        totalTrackCount.value = fullList.length
      }

      if (requestId !== fetchTracksRequestId) return

      const cache = clientTrackCache.value || []
      const { from, to } = trackPageRange(page)
      const slice = cache.slice(from, to + 1)
      tracks.value = append ? [...tracks.value, ...slice] : slice
      currentPage.value = page
      return
    }

    const { tracks: pageTracks, count } = await fetchServerTrackPage(params, page)
    if (requestId !== fetchTracksRequestId) return

    tracks.value = append ? [...tracks.value, ...pageTracks] : pageTracks
    totalTrackCount.value = count
    currentPage.value = page
  } catch (error) {
    if (requestId !== fetchTracksRequestId) return
    console.error('Error loading tracks:', error)
    if (!append) {
      tracks.value = []
      totalTrackCount.value = 0
    }
  } finally {
    if (requestId === fetchTracksRequestId) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

const fetchTracks = async () => {
  await loadTracksPage({ page: 0, append: false })
}

const handleLoadMore = () => {
  if (loadingMore.value || loading.value || !hasMoreTracks.value) return
  void loadTracksPage({ page: currentPage.value + 1, append: true })
}

// Refetch when profile id is resolved or auth state changes (shortlist mode)
watch(
  [() => isReady.value, () => profileUserId.value, () => user.value?.id],
  ([, profileId]) => {
    if (profileId) {
      void fetchTracks()
    }
  },
  { immediate: true }
)

// Refetch when returning to this page (e.g. All Music after Collections)
watch(
  () => route.params.id as string,
  (id, previousId) => {
    if (id && id !== previousId && profileUserId.value) {
      void fetchTracks()
    }
  }
)

onActivated(() => {
  if (profileUserId.value) {
    void fetchTracks()
  }
})

const handleEdit = (track: any) => {
  // Emit event to parent layout to open modal in edit mode
  const event = new CustomEvent('edit-track', { 
    detail: track,
    bubbles: true,
    composed: true
  })
  window.dispatchEvent(event)
}

// Handle track shortlisted event
const handleTrackShortlisted = () => {
  // If viewing own profile as creator, refetch tracks to show the new shortlist
  if (isOwnProfile.value && viewerUserType.value === 'creator') {
    fetchTracks()
  }
}

// Handle track unshortlisted event
const handleTrackUnshortlisted = () => {
  // If viewing own profile as creator, refetch tracks to remove from shortlist
  if (isOwnProfile.value && viewerUserType.value === 'creator') {
    fetchTracks()
  }
}

// handleSearch removed - search is now handled by SearchModal

const handleOpenFilterSort = () => {
  if (openFilterModal) {
    openFilterModal()
  }
}

const handleClearFilterSort = () => {
  lastAppliedParams.value = null
  clearFilterSort?.()
}

// Apply filters and sort to tracks
const updateFiltersAndSort = async (params: any) => {
  await loadTracksPage({ page: 0, append: false, params })
}

// Set SEO meta tags using useSeoMeta (recommended by Nuxt for SEO)
// CRITICAL: Compute values AFTER initialData is available and use plain strings for SSR
// Computed refs can evaluate before data is ready during SSR, so we compute once after await
const profileForSEO = initialData.value?.profile
const name = profileForSEO?.display_name || profileForSEO?.username || profileName.value || route.params.id
const tracksForSEO = initialData.value?.tracks || tracks.value
const trackCount = tracksForSEO && tracksForSEO.length > 0 ? `${tracksForSEO.length}+ tracks` : 'Music collection'

// Compute SEO values as plain strings (not computed refs) to ensure SSR has correct values
// Ensure all values are non-empty strings (useSeoMeta may skip undefined/empty values)
const seoTitle = name ? `${name}'s Music Library` : 'Music Library'
const seoDescription = name
  ? `Explore ${name}'s music collection on Beatbox - ${trackCount}`
  : 'Explore music collection on Beatbox'
const seoUrl = `${siteUrl}/u/${profileForSEO?.username || username.value || route.params.id}`

// PHASE 2: Log before setting SEO meta tags
if (process.server) {
}

// Use useHead with direct values - this pattern works reliably during SSR
// The values are calculated after await useAsyncData, so they're available during SSR
// This matches the pattern used in /u/[username]/t/[track].vue which works correctly
useHead({
  title: seoTitle,
  meta: [
    { name: 'description', content: seoDescription },
    { property: 'og:title', content: seoTitle },
    { property: 'og:description', content: seoDescription },
    { property: 'og:url', content: seoUrl },
    { property: 'og:type', content: 'profile' },
    { property: 'og:image', content: getDefaultOgImageUrl(siteUrl) },
    { property: 'og:image:type', content: DEFAULT_OG_IMAGE_TYPE },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: seoTitle },
    { name: 'twitter:description', content: seoDescription },
    { name: 'twitter:image', content: getDefaultOgImageUrl(siteUrl) }
  ],
  link: [
    { rel: 'canonical', href: seoUrl, key: 'canonical' }
  ]
})

// Expose fetchTracks and updateFiltersAndSort for parent to call
defineExpose({
  fetchTracks,
  updateFiltersAndSort
})

// Listen for track update events
const handleTrackUpdate = async (event: any) => {
  const updatedTrack = event?.detail?.track
  
  if (updatedTrack) {
    // Update the specific track in place instead of refetching everything
    const index = tracks.value.findIndex(t => t.id === updatedTrack.id)
    if (index !== -1) {
      // Preserve scroll position by updating in place
      tracks.value[index] = updatedTrack
    } else {
    }
  } else {
    // Fallback: refetch if no track data provided (e.g., track deleted)
    await fetchTracks()
  }
}

// Lifecycle
onMounted(async () => {
  await fetchProfile()
  if (!initialData.value?.profile) {
    await refreshInitialData()
  }
  // Software is already loaded via useAsyncData (cached), no need to fetch again
  
  if (profileUserId.value && !isOwnProfile.value) {
    void recordPageView({
      profileId: profileUserId.value,
      pageType: 'profile',
    })
  }

  await fetchProfileCollections()
  loadPanelOpenState()
  
  // Register initial context items
  if (registerContextItems && tracks.value.length > 0) {
    registerContextItems(tracks.value, ['title', 'artist'])
  }

  // Register filter/sort handler so layout can call updateFiltersAndSort when user applies
  if (registerFiltersAndSortHandler) {
    registerFiltersAndSortHandler(updateFiltersAndSort)
  }

  // Listen for track updates
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  fetchTracksRequestId++
  if (unregisterContextItems) {
    unregisterContextItems()
  }
  if (unregisterFiltersAndSortHandler) {
    unregisterFiltersAndSortHandler()
  }
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

