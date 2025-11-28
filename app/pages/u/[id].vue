<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow">
    <!-- Profile Header -->
    <LibraryHeader :title="profileName" :count="filteredTracks.length" />

    <div class="flex flex-col md:flex-row gap-0 justify-between md:items-center border-b border-neutral-800">

      <!-- Profile Info -->
      <div class="flex flex-col gap-2 p-4">
        <div class="text-sm text-neutral-300 pt-1">
          <span v-if="profileBio">{{ profileBio }}</span>
          <span v-else class="text-neutral-500 italic">Something's supposed to be here</span>
        </div>
        <div v-if="profileWebsite || hasSocialLinks || isOwnProfile"
          class="flex flex-row gap-2 text-sm text-neutral-400 flex-wrap items-center">
          <a v-if="profileWebsite" :href="profileWebsite" target="_blank" rel="noopener noreferrer"
            class="hover:text-neutral-300 transition-colors">Website</a>

          <!-- Social Links -->
          <div class="flex flex-row gap-0">
            <template v-for="platform in socialLinkPlatforms" :key="platform">
              <!-- Editing state -->
              <div v-if="editingSocialLink === platform"
                class="flex flex-row gap-1 items-center border border-neutral-800 hover:border-neutral-700 focus:border-neutral-700 rounded-md p-1">
                <input ref="socialLinkInputRef" v-model="newSocialLinkValue" type="text"
                  class="px-1 text-sm rounded text-neutral-200 outline-none min-w-[200px]"
                  @keyup.enter="saveSocialLink(platform)" @keyup.esc="cancelEditingSocialLink" />
                <button @click="cancelEditingSocialLink"
                  class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer" title="Cancel">
                  <Xmark class="w-[10px] h-[10px]" />
                </button>
                <button @click="saveSocialLink(platform)"
                  class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer" title="Save">
                  <Check class="w-[10px] h-[10px]" />
                </button>
              </div>
              <!-- Existing link with edit/delete buttons -->
              <div v-else-if="profileSocialLinks[platform]"
                class="flex flex-row gap-0 items-center border border-transparent hover:border-neutral-800 rounded-md p-1 hover:*:opacity-100">
                <a :href="profileSocialLinks[platform]" target="_blank" rel="noopener noreferrer"
                  class="hover:text-neutral-300 transition-colors px-1">
                  {{ getPlatformDisplayName(platform) }}
                </a>
                <template v-if="isOwnProfile">
                  <button @click="startEditingSocialLink(platform)"
                    class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer opacity-30" title="Edit">
                    <EditPencil class="w-[10px] h-[10px]" />
                  </button>
                  <button @click="deleteSocialLink(platform)"
                    class="p-1 rounded hover:bg-red-900/20 transition-colors cursor-pointer opacity-30" title="Delete">
                    <Trash class="w-2.5 h-2.5 max-w-2.5 max-h-2.5 text-red-500" />
                  </button>
                </template>
              </div>
            </template>

          </div>

          <!-- Single plus button to add another social link (only show if own profile, has links, and not all platforms are filled) -->
          <div
            v-if="isOwnProfile && hasSocialLinks && !editingSocialLink && socialLinkPlatforms.some(p => !profileSocialLinks[p])"
            class="flex flex-row gap-1 items-center">
            <button @click="startAddingSocialLink(getNextAvailablePlatform())"
              class="p-1 bg-neutral-800 rounded hover:bg-neutral-700 transition-colors cursor-pointer"
              title="Add Social Link">
              <Plus class="w-2.5 h-2.5 max-w-2.5 max-h-2.5" />
            </button>
          </div>

          <!-- Show "Add Social Links" text if no links exist and is own profile -->
          <div v-if="isOwnProfile && !hasSocialLinks && !editingSocialLink" @click="startAddingSocialLink('twitter')"
            class="hover:text-neutral-300 transition-colors cursor-pointer">
            Add Social Links
          </div>

        </div>
      </div>

      <div class="flex flex-row gap-2 max-md:py-2 p-4 max-md:border-t max-md:border-neutral-800">
        <div @click="toggleSoftwareSection"
          class="rounded-full px-4 py-2 w-fit flex items-start justify-start whitespace-nowrap cursor-pointer transition-colors text-xs text-neutral-400 select-none border border-neutral-800"
          :class="softwareSectionOpen ? 'bg-neutral-800 !text-neutral-200' : 'bg-transparent hover:bg-neutral-800'">
          Software
        </div>
        <div @click="toggleMusicSection"
          class="rounded-full px-4 py-2 w-fit flex items-start justify-start whitespace-nowrap cursor-pointer transition-colors text-xs text-neutral-400 select-none border border-neutral-800"
          :class="musicSectionOpen ? 'bg-neutral-800 !text-neutral-200' : 'bg-transparent hover:bg-neutral-800'">
          Music
        </div>
        <div v-if="isOwnProfile" @click="toggleMembersSection"
          class="rounded-full px-4 py-2 w-fit flex items-start justify-start whitespace-nowrap cursor-pointer transition-colors text-xs text-neutral-400 select-none border border-neutral-800"
          :class="membersSectionOpen ? 'bg-neutral-800 !text-neutral-200' : 'bg-transparent hover:bg-neutral-800'">
          Members
        </div>
      </div>
    </div>


    <!-- Software Section -->
    <div v-if="softwareSectionOpen" class="flex flex-col gap-0 border-b border-neutral-800">
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
    <div v-if="musicSectionOpen" class="grow">
      <TracksTable :tracks="filteredTracks" :source-id="`profile-${profileUserId}`" :is-own-profile="isOwnProfile"
        :loading="loading" :username="username" @edit-track="handleEdit" @tracks-deleted="fetchTracks" />
    </div>

    <!-- Members Section -->
    <div v-if="isOwnProfile && membersSectionOpen && profileUserId" class="grow border-b border-neutral-800">
      <div class="p-4">
        <ManageMembers :profile-id="profileUserId" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import LibraryHeader from '~/components/LibraryHeader.vue'
import TracksTable from '~/components/TracksTable.vue'
import ManageMembers from '~/components/ManageMembers.vue'
import gsap from 'gsap'
import { Plus, EditPencil, Trash, Check, Xmark } from '@iconoir/vue'
const route = useRoute()
const { user, isReady } = useAuth()
const { supabase } = useSupabase()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

// Inject search handler registration functions
const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')

// Fetch initial profile data server-side for SEO
const { data: initialData } = await useAsyncData(
  `profile-${route.params.id}`,
  async () => {
    if (!supabase) return null
    
    const usernameOrId = route.params.id as string
    
    try {
      // Try to fetch profile by username
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, bio, website, social_links')
        .eq('username', usernameOrId)
        .single()

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
  }
)

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
const profileName = ref(initialData.value?.profile?.display_name || initialData.value?.profile?.username || '')
const username = ref(initialData.value?.profile?.username || '')
const profileUserId = ref<string | null>(initialData.value?.profile?.id || null)
const profileBio = ref(initialData.value?.profile?.bio || '')
const profileWebsite = ref(initialData.value?.profile?.website || '')
const profileSocialLinks = ref<{
  twitter?: string
  instagram?: string
  soundcloud?: string
  spotify?: string
  youtube?: string
  [key: string]: string | undefined
}>((initialData.value?.profile?.social_links as any) || {})
const tracks = ref<any[]>(initialData.value?.tracks || [])
const loading = ref(false)
const searchQuery = ref('')
const allSoftware = computed(() => softwareData.value || [])
const loadingSoftware = computed(() => softwareData.value === null)

// Software section visibility state (closed by default)
const softwareSectionOpenState = ref(false)

// Check if software is available
const hasSoftware = computed(() => {
  return !loadingSoftware.value && allSoftware.value.length > 0
})

// Software section visibility - can be toggled manually, but starts closed if no software
const softwareSectionOpen = computed(() => softwareSectionOpenState.value)

// Music section visibility state (open by default)
const musicSectionOpen = ref(true)

// Members section visibility state (closed by default, only for own profile)
const membersSectionOpen = ref(false)

// Load software section state from localStorage
const loadSoftwareSectionState = () => {
  try {
    const saved = localStorage.getItem('softwareSectionOpen')
    if (saved !== null) {
      // Only restore state if there's software available
      // If no software, always start closed regardless of cache
      if (hasSoftware.value) {
        softwareSectionOpenState.value = saved === 'true'
      } else {
        softwareSectionOpenState.value = false
      }
    }
  } catch (e) {
    console.error('Error loading software section state:', e)
  }
}

// Save software section state to localStorage
const saveSoftwareSectionState = () => {
  try {
    localStorage.setItem('softwareSectionOpen', softwareSectionOpenState.value.toString())
  } catch (e) {
    console.error('Error saving software section state:', e)
  }
}

// Toggle software section
const toggleSoftwareSection = () => {
  softwareSectionOpenState.value = !softwareSectionOpenState.value
  saveSoftwareSectionState()
}

// Load music section state from localStorage
const loadMusicSectionState = () => {
  try {
    const saved = localStorage.getItem('musicSectionOpen')
    if (saved !== null) {
      musicSectionOpen.value = saved === 'true'
    }
  } catch (e) {
    console.error('Error loading music section state:', e)
  }
}

// Save music section state to localStorage
const saveMusicSectionState = () => {
  try {
    localStorage.setItem('musicSectionOpen', musicSectionOpen.value.toString())
  } catch (e) {
    console.error('Error saving music section state:', e)
  }
}

// Toggle music section
const toggleMusicSection = () => {
  musicSectionOpen.value = !musicSectionOpen.value
  saveMusicSectionState()
}

// Toggle members section
const toggleMembersSection = () => {
  membersSectionOpen.value = !membersSectionOpen.value
}

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

// Check if user has any social links
const hasSocialLinks = computed(() => {
  const links = profileSocialLinks.value
  return !!(links?.twitter || links?.instagram || links?.soundcloud || links?.spotify || links?.youtube)
})

// Social links editing state
const editingSocialLink = ref<string | null>(null)
const newSocialLinkValue = ref('')
const socialLinkInputRef = ref<HTMLInputElement | null>(null)

// Available social link platforms
const socialLinkPlatforms = ['twitter', 'instagram', 'soundcloud', 'spotify', 'youtube'] as const
type SocialLinkPlatform = typeof socialLinkPlatforms[number]

// Get display name for platform
const getPlatformDisplayName = (platform: string): string => {
  const names: Record<string, string> = {
    twitter: 'Twitter',
    instagram: 'Instagram',
    soundcloud: 'SoundCloud',
    spotify: 'Spotify',
    youtube: 'YouTube'
  }
  return names[platform] || platform
}

// Get the next available platform that doesn't have a link
const getNextAvailablePlatform = (): string => {
  return socialLinkPlatforms.find(p => !profileSocialLinks.value[p]) || socialLinkPlatforms[0]
}

// Start editing a social link
const startEditingSocialLink = (platform: string) => {
  editingSocialLink.value = platform
  const currentUrl = profileSocialLinks.value[platform as SocialLinkPlatform] || ''
  // Keep the full URL including https://
  newSocialLinkValue.value = currentUrl || 'https://'
}

// Start adding a new social link
const startAddingSocialLink = (platform: string) => {
  editingSocialLink.value = platform
  newSocialLinkValue.value = 'https://'
}

// Cancel editing
const cancelEditingSocialLink = () => {
  editingSocialLink.value = null
  newSocialLinkValue.value = ''
}

// Save social link
const saveSocialLink = async (platform: string) => {
  if (!supabase || !profileUserId.value || !user.value) return
  
  let url = newSocialLinkValue.value.trim()
  
  // Ensure URL starts with https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  
  // Validate URL
  try {
    new URL(url)
  } catch (e) {
    alert('Please enter a valid URL')
    return
  }
  
  try {
    // Get current social_links
    const currentLinks = { ...profileSocialLinks.value }
    // Update the specific platform
    currentLinks[platform as SocialLinkPlatform] = url
    
    // Update database
    const { error } = await supabase
      .from('user_profiles')
      .update({ social_links: currentLinks })
      .eq('id', profileUserId.value)
    
    if (error) throw error
    
    // Update local state
    profileSocialLinks.value = currentLinks
    editingSocialLink.value = null
    newSocialLinkValue.value = ''
    
    // Refresh initial data
    await refreshProfile()
  } catch (error) {
    console.error('Error saving social link:', error)
    alert('Failed to save social link')
  }
}

// Delete social link
const deleteSocialLink = async (platform: string) => {
  if (!supabase || !profileUserId.value || !user.value) return
  
  if (!confirm(`Are you sure you want to remove your ${getPlatformDisplayName(platform)} link?`)) {
    return
  }
  
  try {
    // Get current social_links
    const currentLinks = { ...profileSocialLinks.value }
    // Remove the platform
    delete currentLinks[platform as SocialLinkPlatform]
    
    // Update database
    const { error } = await supabase
      .from('user_profiles')
      .update({ social_links: currentLinks })
      .eq('id', profileUserId.value)
    
    if (error) throw error
    
    // Update local state
    profileSocialLinks.value = currentLinks
  } catch (error) {
    console.error('Error deleting social link:', error)
    alert('Failed to delete social link')
  }
}

// Refresh profile data
const refreshProfile = async () => {
  if (!supabase || !profileUserId.value) return
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('bio, website, social_links')
      .eq('id', profileUserId.value)
      .single()
    
    if (error) throw error
    
    if (data) {
      profileBio.value = data.bio || ''
      profileWebsite.value = data.website || ''
      profileSocialLinks.value = (data.social_links as any) || {}
    }
  } catch (error) {
    console.error('Error refreshing profile:', error)
  }
}

// Watch for editingSocialLink changes to focus input
watch(editingSocialLink, async (newPlatform) => {
  if (newPlatform) {
    await nextTick()
    if (socialLinkInputRef.value) {
      socialLinkInputRef.value.focus()
      const httpsPrefix = 'https://'
      if (newSocialLinkValue.value === httpsPrefix || !newSocialLinkValue.value.startsWith(httpsPrefix)) {
        await nextTick()
        if (socialLinkInputRef.value) {
          socialLinkInputRef.value.setSelectionRange(httpsPrefix.length, httpsPrefix.length)
        }
      } else {
        // If editing existing link, position cursor at end
        await nextTick()
        if (socialLinkInputRef.value) {
          const len = newSocialLinkValue.value.length
          socialLinkInputRef.value.setSelectionRange(len, len)
        }
      }
    }
  }
})

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
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

const filteredTracks = computed(() => {
  if (!searchQuery.value) return tracks.value
  
  const query = searchQuery.value.trim().toLowerCase()
  return tracks.value.filter(track => {
    const title = track.title?.toLowerCase() || ''
    const artist = track.artist?.toLowerCase() || ''
    return title.includes(query) || artist.includes(query)
  })
})

// Helper function to get image URL for software
const getSoftwareImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '/img/placeholder.png'
  if (imageUrl.startsWith('http')) return imageUrl
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return '/img/placeholder.png'
  return `${supabaseUrl}/storage/v1/object/public/resource-images/${imageUrl}`
}

// Methods - Keep fetchProfile for backwards compatibility but simplified
const fetchProfile = async () => {
  // Profile already loaded server-side, just ensure values are set
  if (!profileUserId.value && initialData.value?.profile) {
    profileUserId.value = initialData.value.profile.id
    profileName.value = initialData.value.profile.display_name || initialData.value.profile.username
    username.value = initialData.value.profile.username
    profileBio.value = initialData.value.profile.bio || ''
    profileWebsite.value = initialData.value.profile.website || ''
    profileSocialLinks.value = (initialData.value.profile.social_links as any) || {}
  }
}

// fetchSoftware is now handled by useAsyncData with caching
// Use refreshSoftware() if you need to manually refresh
const fetchSoftware = async () => {
  await refreshSoftware()
}

const fetchTracks = async () => {
  if (!supabase || !profileUserId.value) {
    console.log('fetchTracks: Missing supabase or profileUserId', { supabase: !!supabase, profileUserId: profileUserId.value })
    return
  }
  
  // Only show loading state if we don't have any tracks yet (from initialData)
  // This prevents showing loading spinner when we already have cached data
  const hasInitialTracks = tracks.value.length > 0
  if (!hasInitialTracks) {
    loading.value = true
  }
  console.log('fetchTracks: Querying sounds for user:', profileUserId.value)
  
  // Load saved sort preferences from localStorage
  let sortBy = 'created_at'
  let sortDirection: 'asc' | 'desc' = 'desc'
  
  try {
    const savedFilters = localStorage.getItem('filterSort_music')
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters)
      if (parsed.sort) {
        sortBy = parsed.sort.sortBy || 'created_at'
        sortDirection = parsed.sort.sortDirection || 'desc'
        console.log('fetchTracks: Using saved sort:', sortBy, sortDirection)
      }
    }
  } catch (e) {
    console.error('fetchTracks: Error loading saved sort:', e)
  }
  
  try {
    const { data, error } = await supabase
      .from('sounds')
      .select(`
        *,
        track_statuses!status_id(id, name)
      `)
      .eq('user_id', profileUserId.value)
      .order(sortBy, { ascending: sortDirection === 'asc' })

    console.log('fetchTracks: Query result', { data, error, count: data?.length })
    
    if (error) throw error
    
    // Fetch collection names and slugs for each track
    const tracksWithCollections = await Promise.all((data || []).map(async (track: any) => {
      // Get collection IDs for this track
      const { data: junctionData } = await supabase
        .from('collections_sounds')
        .select('collection_id')
        .eq('sound_id', track.id)
      
      const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
      
      if (collectionIds.length === 0) {
        return {
          ...track,
          collections: [],
          track_status: track.track_statuses
        }
      }
      
      // Get collection names and slugs
      const { data: collectionData } = await supabase
        .from('collections')
        .select('name, slug')
        .in('id', collectionIds)
      
      return {
        ...track,
        collections: collectionData || [],
        track_status: track.track_statuses
      }
    }))
    
    tracks.value = tracksWithCollections
  } catch (error) {
    console.error('Error fetching tracks:', error)
    alert('Failed to load tracks: ' + (error as any).message)
  } finally {
    loading.value = false
  }
}

const handleEdit = (track: any) => {
  // Emit event to parent layout to open modal in edit mode
  const event = new CustomEvent('edit-track', { 
    detail: track,
    bubbles: true,
    composed: true
  })
  window.dispatchEvent(event)
}

const handleSearch = (query: string) => {
  searchQuery.value = query
}

// Set SEO meta tags - use initialData for SSR, then reactive values for updates
const profileForSEO = computed(() => initialData.value?.profile)
const tracksForSEO = computed(() => initialData.value?.tracks || tracks.value)

const seoTitle = computed(() => {
  const name = profileForSEO.value?.display_name || profileForSEO.value?.username || profileName.value
  return name 
    ? `${name}'s Music Library | Beatbox`
    : 'Music Library | Beatbox'
})

const seoDescription = computed(() => {
  const trackCount = tracksForSEO.value.length > 0 ? `${tracksForSEO.value.length}+ tracks` : 'Music collection'
  const name = profileForSEO.value?.display_name || profileForSEO.value?.username || profileName.value
  return name
    ? `Explore ${name}'s music collection on Beatbox - ${trackCount}`
    : 'Explore music collection on Beatbox'
})

const seoUrl = computed(() => {
  const usernameValue = profileForSEO.value?.username || username.value || route.params.id
  return `${siteUrl}/u/${usernameValue}`
})

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogUrl: seoUrl,
  ogType: 'profile',
  ogImage: `${siteUrl}/img/og-image.jpg`,
  ogImageWidth: '1200',
  ogImageHeight: '630',
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: `${siteUrl}/img/og-image.jpg`
})

useHead({
  link: [
    { rel: 'canonical', href: seoUrl }
  ]
})

// Apply filters and sort to tracks
const updateFiltersAndSort = async (params: any) => {
  console.log('All Music page: Applying filters and sort:', params)
  
  if (!supabase || !profileUserId.value) return
  
  loading.value = true
  
  try {
    let query = supabase
      .from('sounds')
      .select(`
        *,
        track_statuses!status_id(id, name)
      `)
      .eq('user_id', profileUserId.value)
    
    // Apply music filters
    const { filters, sort } = params
    
    // Genre filter
    if (filters.genre?.length > 0) {
      query = query.in('genre', filters.genre)
    }
    
    // BPM range filter
    if (filters.bpm?.min) {
      query = query.gte('bpm', filters.bpm.min)
    }
    if (filters.bpm?.max) {
      query = query.lte('bpm', filters.bpm.max)
    }
    
    // Key filter
    if (filters.key?.length > 0) {
      query = query.in('key', filters.key)
    }
    
    // Mood filter (array overlap)
    if (filters.mood?.length > 0) {
      query = query.overlaps('mood', filters.mood)
    }
    
    // Year range filter
    if (filters.year?.min) {
      query = query.gte('year', filters.year.min)
    }
    if (filters.year?.max) {
      query = query.lte('year', filters.year.max)
    }
    
    // Status filter
    if (filters.status?.length > 0) {
      query = query.in('status_id', filters.status)
    }
    
    // Apply sort
    query = query.order(sort.sortBy, { ascending: sort.sortDirection === 'asc' })
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Fetch collection names and slugs for each track
    const tracksWithCollections = await Promise.all((data || []).map(async (track: any) => {
      const { data: junctionData } = await supabase
        .from('collections_sounds')
        .select('collection_id')
        .eq('sound_id', track.id)
      
      const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
      
      if (collectionIds.length === 0) {
        return {
          ...track,
          collections: [],
          track_status: track.track_statuses
        }
      }
      
      const { data: collectionData } = await supabase
        .from('collections')
        .select('name, slug')
        .in('id', collectionIds)
      
      return {
        ...track,
        collections: collectionData || [],
        track_status: track.track_statuses
      }
    }))
    
    tracks.value = tracksWithCollections
  } catch (error) {
    console.error('Error filtering tracks:', error)
  } finally {
    loading.value = false
  }
}

// Expose fetchTracks, handleSearch, and updateFiltersAndSort for parent to call
defineExpose({
  fetchTracks,
  handleSearch,
  updateFiltersAndSort
})

// Listen for track update events
const handleTrackUpdate = async (event: any) => {
  const updatedTrack = event?.detail?.track
  
  if (updatedTrack) {
    // Update the specific track in place instead of refetching everything
    console.log('[id].vue: Updating track in place:', updatedTrack.id)
    const index = tracks.value.findIndex(t => t.id === updatedTrack.id)
    if (index !== -1) {
      // Preserve scroll position by updating in place
      tracks.value[index] = updatedTrack
      console.log('[id].vue: Track updated in place, scroll position preserved')
    } else {
      console.log('[id].vue: Track not found in current list, may need to refetch')
    }
  } else {
    // Fallback: refetch if no track data provided (e.g., track deleted)
    console.log('[id].vue: No track data provided, refetching all tracks')
    await fetchTracks()
  }
}

// Lifecycle
onMounted(async () => {
  await fetchProfile()
  await fetchTracks()
  // Software is already loaded via useAsyncData (cached), no need to fetch again
  
  // Load section states from localStorage
  loadMusicSectionState()
  // Load software section state after checking if software is available
  // Use nextTick to ensure software data is loaded first
  await nextTick()
  loadSoftwareSectionState()
  
  // Register search handler
  if (registerSearchHandler) {
    registerSearchHandler(handleSearch)
  }
  
  // Listen for track updates
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  // Unregister search handler
  if (unregisterSearchHandler) {
    unregisterSearchHandler()
  }
  
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

