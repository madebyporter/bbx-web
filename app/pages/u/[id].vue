<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow">

    <!-- Profile Header -->
    <div class="flex flex-col lg:flex-row justify-start lg:justify-between items-stretch gap-2 p-4">
      <div class="flex flex-col gap-2 overflow-auto">
        <!-- Display Name and Username -->
        <div class="flex flex-row gap-2 items-end flex-wrap">
          <!-- Display Name Section -->
          <div class="flex flex-row gap-2 items-center">
            <!-- Editing Display Name -->
            <div v-if="editingDisplayName"
              class="flex flex-row gap-1 items-center border border-neutral-800 hover:border-neutral-700 focus:border-neutral-700 rounded-md p-1">
              <input ref="displayNameInputRef" v-model="newDisplayNameValue" type="text"
                class="px-1 text-sm rounded text-neutral-200 outline-none min-w-[200px]" @keyup.enter="saveDisplayName"
                @keyup.esc="cancelEditingDisplayName" />
              <button @click="cancelEditingDisplayName"
                class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer" title="Cancel">
                <Xmark class="w-[10px] h-[10px]" />
              </button>
              <button @click="saveDisplayName" class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Save">
                <Check class="w-[10px] h-[10px]" />
              </button>
            </div>
            <!-- Display Name (not editing) -->
            <template v-else>
              <div v-if="profileName" class="flex flex-row gap-1 items-center group">
                <h1 class="text-xl lg:text-3xl font-bold truncate">{{ profileName }}</h1>
                <button v-if="isOwnProfile" @click="startEditingDisplayName"
                  class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Edit Display Name">
                  <EditPencil class="w-[10px] h-[10px]" />
                </button>
              </div>
              <h1 v-else-if="isOwnProfile" @click="startEditingDisplayName"
                class="text-xl lg:text-3xl font-bold text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer truncate">
                Add a Display Name
              </h1>
            </template>
          </div>
          <!-- Username Section -->
          <div class="flex flex-row gap-1 items-end">
            <!-- Editing Username -->
            <div v-if="editingUsername"
              class="flex flex-row gap-1 items-center border border-neutral-800 hover:border-neutral-700 focus:border-neutral-700 rounded-md p-1">
              <span class="text-base lg:text-xl font-normal text-neutral-400">@</span>
              <input ref="usernameInputRef" v-model="newUsernameValue" type="text"
                class="px-1 text-sm rounded text-neutral-200 outline-none min-w-[150px]" @keyup.enter="saveUsername"
                @keyup.esc="cancelEditingUsername" />
              <button @click="cancelEditingUsername"
                class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer" title="Cancel">
                <Xmark class="w-[10px] h-[10px]" />
              </button>
              <button @click="saveUsername" class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Save">
                <Check class="w-[10px] h-[10px]" />
              </button>
            </div>
            <!-- Username (not editing) -->
            <template v-else>
              <div v-if="username" class="flex flex-row gap-1 items-center group">
                <span class="text-base lg:text-xl font-normal text-neutral-400">@{{ username }}</span>
                <button v-if="isOwnProfile" @click="startEditingUsername"
                  class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Edit Username">
                  <EditPencil class="w-[10px] h-[10px]" />
                </button>
              </div>
              <span v-else-if="isOwnProfile" @click="startEditingUsername"
                class="text-sm lg:text-base font-normal text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
                Add @username
              </span>
            </template>
          </div>
        </div>
      </div>

      <!-- Section Toggles -->
      <div class="flex flex-row gap-2 items-center">
        <div @click="toggleBioSection"
          class="rounded-full px-4 py-2 w-fit flex items-center justify-center whitespace-nowrap cursor-pointer transition-colors text-xs text-neutral-400 select-none border border-neutral-800"
          :class="bioSectionOpen ? 'bg-neutral-800 !text-neutral-200' : 'bg-transparent hover:bg-neutral-800'">
          Bio
        </div>
        <div @click="toggleSoftwareSection"
          class="rounded-full px-4 py-2 w-fit flex items-center justify-center whitespace-nowrap cursor-pointer transition-colors text-xs text-neutral-400 select-none border border-neutral-800"
          :class="softwareSectionOpen ? 'bg-neutral-800 !text-neutral-200' : 'bg-transparent hover:bg-neutral-800'">
          Software
        </div>
        <div v-if="isOwnProfile && isAudioPro" @click="toggleMembersSection"
          class="rounded-full px-4 py-2 w-fit flex items-center justify-center whitespace-nowrap cursor-pointer transition-colors text-xs text-neutral-400 select-none border border-neutral-800"
          :class="membersSectionOpen ? 'bg-neutral-800 !text-neutral-200' : 'bg-transparent hover:bg-neutral-800'">
          Members
        </div>
        <div @click="toggleMusicSection"
          class="rounded-full px-4 py-2 w-fit flex items-center justify-center whitespace-nowrap cursor-pointer transition-colors text-xs text-neutral-400 select-none border border-neutral-800"
          :class="musicSectionOpen ? 'bg-neutral-800 !text-neutral-200' : 'bg-transparent hover:bg-neutral-800'">
          Music
        </div>
      </div>
    </div>

    

    <!-- Bio Section -->
    <div v-if="bioSectionOpen" class="flex flex-col gap-0 p-4 border-t border-neutral-800">
      <!-- Profile Info -->
      <div class="flex flex-col gap-1">
        <!-- Bio -->
        <div class="text-sm text-neutral-400">
          <!-- Editing Bio -->
          <div v-if="editingBio"
            class="flex flex-row gap-1 items-start border border-neutral-800 hover:border-neutral-700 focus:border-neutral-700 rounded-md p-1">
            <textarea ref="bioInputRef" v-model="newBioValue"
              class="px-1 text-sm rounded text-neutral-200 outline-none min-w-[300px] min-h-[60px] resize-y"
              @keyup.ctrl.enter="saveBio" @keyup.esc="cancelEditingBio"></textarea>
            <div class="flex flex-col gap-1">
              <button @click="cancelEditingBio"
                class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer" title="Cancel">
                <Xmark class="w-[10px] h-[10px]" />
              </button>
              <button @click="saveBio" class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Save">
                <Check class="w-[10px] h-[10px]" />
              </button>
            </div>
          </div>
          <!-- Bio (not editing) -->
          <template v-else>
            <span v-if="profileBio">{{ profileBio }}</span>
            <span v-else-if="isOwnProfile" @click="startEditingBio"
              class="text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer italic">
              Add a bio
            </span>
            <span v-else class="text-neutral-500 italic">Something's supposed to be here</span>
          </template>
        </div>
        <div v-if="profileWebsite || hasSocialLinks || isOwnProfile"
          class="flex flex-row gap-2 text-sm text-neutral-400 flex-wrap items-center">
          <!-- Editing Website -->
          <div v-if="editingWebsite"
            class="flex flex-row gap-1 items-center border border-neutral-800 hover:border-neutral-700 focus:border-neutral-700 rounded-md p-1">
            <input ref="websiteInputRef" v-model="newWebsiteValue" type="text"
              class="px-1 text-sm rounded text-neutral-200 outline-none min-w-[200px]" @keyup.enter="saveWebsite"
              @keyup.esc="cancelEditingWebsite" />
            <button @click="cancelEditingWebsite"
              class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer" title="Cancel">
              <Xmark class="w-[10px] h-[10px]" />
            </button>
            <button @click="saveWebsite" class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Save">
              <Check class="w-[10px] h-[10px]" />
            </button>
          </div>
          <!-- Website (not editing) -->
          <template v-else>
            <a v-if="profileWebsite" :href="profileWebsite" target="_blank" rel="noopener noreferrer"
              class="hover:text-neutral-300 transition-colors">Website</a>
            <span v-else-if="isOwnProfile" @click="startEditingWebsite"
              class="text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
              Add Website
            </span>
          </template>

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
                <a :href="String(profileSocialLinks[platform])" target="_blank" rel="noopener noreferrer"
                  class="hover:text-neutral-300 transition-colors px-1">
                  {{ getDisplayNameFromUrl(String(profileSocialLinks[platform] || ''), platform) }}
                </a>
                <template v-if="isOwnProfile">
                  <button @click="startEditingSocialLink(platform)"
                    class="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer opacity-30" title="Edit">
                    <EditPencil class="w-[10px] h-[10px]" />
                  </button>
                  <button @click="deleteSocialLink(platform)"
                    class="p-1 rounded hover:bg-red-900/20 transition-colors cursor-pointer opacity-30"
                    title="Delete">
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
    <!-- Members Section -->
    <div v-if="isOwnProfile && isAudioPro && membersSectionOpen && profileUserId" class="grow border-b border-neutral-800">
      <div class="p-4">
        <ManageMembers :profile-id="profileUserId" />
      </div>
    </div>
    <!-- Tracks Section -->
    <div v-if="musicSectionOpen" class="grow border-t border-neutral-800">
      <div class="flex flex-row justify-between items-center gap-4 p-4">
        <div class="flex flex-col overflow-auto">
          <h2 class="text-lg lg:text-xl font-bold truncate">Music</h2>
        </div>
        <div class="flex items-center gap-4">
          <p class="text-sm text-neutral-500">
            {{ filteredTracks.length }} {{ filteredTracks.length === 1 ? 'track' : 'tracks' }}
          </p>
          <button 
            @click="handleOpenFilterSort"
            class="btn !px-3 !py-1.5 text-sm"
          >
            Filter & Sort
          </button>
        </div>
      </div>
      <TracksTable :tracks="filteredTracks" :source-id="`profile-${profileUserId}`" :is-own-profile="isOwnProfile"
        :loading="loading" :username="username" :viewer-user-type="viewerUserType" :profile-user-type="profileUserType"
        @edit-track="handleEdit" @tracks-deleted="fetchTracks" @track-shortlisted="handleTrackShortlisted" @track-unshortlisted="handleTrackUnshortlisted" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import TracksTable from '~/components/TracksTable.vue'
import ManageMembers from '~/components/ManageMembers.vue'
import gsap from 'gsap'
import { Plus, EditPencil, Trash, Check, Xmark } from '@iconoir/vue'
const route = useRoute()
const { user, isReady } = useAuth()
const { supabase } = useSupabase()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

// Inject context items registration functions
const registerContextItems = inject<(items: any[], fields: string[]) => void>('registerContextItems')
const unregisterContextItems = inject<() => void>('unregisterContextItems')
const openFilterModal = inject<() => void>('openFilterModal')

// Fetch initial profile data server-side for SEO
const { data: initialData } = await useAsyncData(
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
          .select('id, username, display_name, bio, website, social_links, user_type')
          .eq('id', usernameOrId)
          .single()
        data = result.data
        error = result.error
      } else {
        // Try to fetch by username
        const result = await supabase
          .from('user_profiles')
          .select('id, username, display_name, bio, website, social_links, user_type')
          .eq('username', usernameOrId)
          .single()
        data = result.data
        error = result.error
      }

      // If username lookup failed and it's not a UUID, try by ID as fallback
      if ((error || !data) && !isUUID) {
        const result = await supabase
          .from('user_profiles')
          .select('id, username, display_name, bio, website, social_links, user_type')
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
const profileBio = ref(initialData.value?.profile?.bio || '')
const profileWebsite = ref(initialData.value?.profile?.website || '')
const profileSocialLinks = ref<{
  twitter?: string
  instagram?: string
  soundcloud?: string
  spotify?: string
  youtube?: string
  linkedin?: string
  [key: string]: string | undefined
}>((initialData.value?.profile?.social_links as any) || {})
const tracks = ref<any[]>(initialData.value?.tracks || [])
const loading = ref(false)
// searchQuery removed - search is now handled by SearchModal
const allSoftware = computed(() => softwareData.value || [])
const loadingSoftware = computed(() => softwareData.value === null)

// Bio section visibility state (closed by default)
const bioSectionOpenState = ref(false)

// Load bio section state from localStorage
const loadBioSectionState = () => {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bioSectionOpen')
      if (saved !== null) {
        bioSectionOpenState.value = saved === 'true'
      }
    }
  } catch (e) {
    console.error('Error loading bio section state:', e)
  }
}

// Save bio section state to localStorage
const saveBioSectionState = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bioSectionOpen', bioSectionOpenState.value.toString())
    }
  } catch (e) {
    console.error('Error saving bio section state:', e)
  }
}

// Toggle bio section
const toggleBioSection = () => {
  bioSectionOpenState.value = !bioSectionOpenState.value
  saveBioSectionState()
}

// Bio section visibility
const bioSectionOpen = computed(() => bioSectionOpenState.value)

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

// Display name and username editing state
const editingDisplayName = ref(false)
const editingUsername = ref(false)
const editingBio = ref(false)
const editingWebsite = ref(false)
const newDisplayNameValue = ref('')
const newUsernameValue = ref('')
const newBioValue = ref('')
const newWebsiteValue = ref('')
const displayNameInputRef = ref<HTMLInputElement | null>(null)
const usernameInputRef = ref<HTMLInputElement | null>(null)
const bioInputRef = ref<HTMLTextAreaElement | null>(null)
const websiteInputRef = ref<HTMLInputElement | null>(null)

// Available social link platforms
const socialLinkPlatforms = ['twitter', 'instagram', 'soundcloud', 'spotify', 'youtube', 'linkedin'] as const
type SocialLinkPlatform = typeof socialLinkPlatforms[number]

// Get display name for platform
const getPlatformDisplayName = (platform: string): string => {
  const names: Record<string, string> = {
    twitter: 'Twitter',
    instagram: 'Instagram',
    soundcloud: 'SoundCloud',
    spotify: 'Spotify',
    youtube: 'YouTube',
    linkedin: 'LinkedIn'
  }
  return names[platform] || platform
}

// Detect platform from URL
const detectPlatformFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Remove www. prefix
    const domain = hostname.replace(/^www\./, '')
    
    // Map domains to platform keys
    const domainMap: Record<string, string> = {
      'twitter.com': 'twitter',
      'x.com': 'twitter', // Twitter is now X
      'instagram.com': 'instagram',
      'soundcloud.com': 'soundcloud',
      'spotify.com': 'spotify',
      'youtube.com': 'youtube',
      'youtu.be': 'youtube',
      'linkedin.com': 'linkedin'
    }
    
    return domainMap[domain] || null
  } catch (e) {
    return null
  }
}

// Get display name for a URL (detects platform from URL)
const getDisplayNameFromUrl = (url: string, fallbackPlatform?: string): string => {
  const detectedPlatform = detectPlatformFromUrl(url)
  const platform = detectedPlatform || fallbackPlatform
  return platform ? getPlatformDisplayName(platform) : 'Link'
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

// Start editing display name
const startEditingDisplayName = () => {
  editingDisplayName.value = true
  newDisplayNameValue.value = profileName.value || ''
}

// Cancel editing display name
const cancelEditingDisplayName = () => {
  editingDisplayName.value = false
  newDisplayNameValue.value = ''
}

// Save display name
const saveDisplayName = async () => {
  if (!supabase || !profileUserId.value || !user.value) return
  
  const displayName = newDisplayNameValue.value.trim()
  
  if (!displayName) {
    alert('Display name cannot be empty')
    return
  }
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: displayName })
      .eq('id', profileUserId.value)
    
    if (error) throw error
    
    // Update local state
    profileName.value = displayName
    editingDisplayName.value = false
    newDisplayNameValue.value = ''
    
    // Refresh initial data
    await refreshProfile()
  } catch (error) {
    console.error('Error saving display name:', error)
    alert('Failed to save display name')
  }
}

// Start editing username
const startEditingUsername = () => {
  editingUsername.value = true
  newUsernameValue.value = username.value || ''
}

// Cancel editing username
const cancelEditingUsername = () => {
  editingUsername.value = false
  newUsernameValue.value = ''
}

// Save username
const saveUsername = async () => {
  if (!supabase || !profileUserId.value || !user.value) return
  
  let newUsername = newUsernameValue.value.trim().toLowerCase()
  
  // Remove @ if user included it
  if (newUsername.startsWith('@')) {
    newUsername = newUsername.slice(1)
  }
  
  if (!newUsername) {
    alert('Username cannot be empty')
    return
  }
  
  // Validate username format (alphanumeric, underscore, hyphen)
  if (!/^[a-z0-9_-]+$/.test(newUsername)) {
    alert('Username can only contain letters, numbers, underscores, and hyphens')
    return
  }
  
  try {
    // Check if username is already taken
    const { data: existingUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', newUsername)
      .neq('id', profileUserId.value)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError
    }
    
    if (existingUser) {
      alert('This username is already taken')
      return
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ username: newUsername })
      .eq('id', profileUserId.value)
    
    if (error) throw error
    
    // Update local state
    username.value = newUsername
    editingUsername.value = false
    newUsernameValue.value = ''
    
    // Refresh initial data
    await refreshProfile()
  } catch (error) {
    console.error('Error saving username:', error)
    alert('Failed to save username')
  }
}

// Start editing bio
const startEditingBio = () => {
  editingBio.value = true
  newBioValue.value = profileBio.value || ''
}

// Cancel editing bio
const cancelEditingBio = () => {
  editingBio.value = false
  newBioValue.value = ''
}

// Save bio
const saveBio = async () => {
  if (!supabase || !profileUserId.value || !user.value) return
  
  const bio = newBioValue.value.trim()
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ bio: bio || null })
      .eq('id', profileUserId.value)
    
    if (error) throw error
    
    // Update local state
    profileBio.value = bio
    editingBio.value = false
    newBioValue.value = ''
    
    // Refresh initial data
    await refreshProfile()
  } catch (error) {
    console.error('Error saving bio:', error)
    alert('Failed to save bio')
  }
}

// Start editing website
const startEditingWebsite = () => {
  editingWebsite.value = true
  newWebsiteValue.value = profileWebsite.value || 'https://'
}

// Cancel editing website
const cancelEditingWebsite = () => {
  editingWebsite.value = false
  newWebsiteValue.value = ''
}

// Save website
const saveWebsite = async () => {
  if (!supabase || !profileUserId.value || !user.value) return
  
  let url = newWebsiteValue.value.trim()
  
  // Ensure URL starts with http:// or https://
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  
  // Validate URL if provided
  if (url && url !== 'https://') {
    try {
      new URL(url)
    } catch (e) {
      alert('Please enter a valid URL')
      return
    }
  } else {
    url = ''
  }
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ website: url || null })
      .eq('id', profileUserId.value)
    
    if (error) throw error
    
    // Update local state
    profileWebsite.value = url
    editingWebsite.value = false
    newWebsiteValue.value = ''
    
    // Refresh initial data
    await refreshProfile()
  } catch (error) {
    console.error('Error saving website:', error)
    alert('Failed to save website')
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
      .select('display_name, username, bio, website, social_links, user_type')
      .eq('id', profileUserId.value)
      .single()
    
    if (error) throw error
    
    if (data) {
      profileName.value = (data.display_name as string) || (data.username as string) || ''
      username.value = (data.username as string) || ''
      profileUserType.value = (data.user_type as 'creator' | 'audio_pro' | null) || null
      profileBio.value = (data.bio as string) || ''
      profileWebsite.value = (data.website as string) || ''
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

// Watch for editingDisplayName changes to focus input
watch(editingDisplayName, async (isEditing) => {
  if (isEditing) {
    await nextTick()
    if (displayNameInputRef.value) {
      displayNameInputRef.value.focus()
      // Select all text if editing existing name
      if (newDisplayNameValue.value) {
        await nextTick()
        if (displayNameInputRef.value) {
          displayNameInputRef.value.select()
        }
      }
    }
  }
})

// Watch for editingUsername changes to focus input
watch(editingUsername, async (isEditing) => {
  if (isEditing) {
    await nextTick()
    if (usernameInputRef.value) {
      usernameInputRef.value.focus()
      // Select all text if editing existing username
      if (newUsernameValue.value) {
        await nextTick()
        if (usernameInputRef.value) {
          usernameInputRef.value.select()
        }
      }
    }
  }
})

// Watch for editingBio changes to focus textarea
watch(editingBio, async (isEditing) => {
  if (isEditing) {
    await nextTick()
    if (bioInputRef.value) {
      bioInputRef.value.focus()
      // Position cursor at end if editing existing bio
      if (newBioValue.value) {
        await nextTick()
        if (bioInputRef.value) {
          const len = newBioValue.value.length
          bioInputRef.value.setSelectionRange(len, len)
        }
      }
    }
  }
})

// Watch for editingWebsite changes to focus input
watch(editingWebsite, async (isEditing) => {
  if (isEditing) {
    await nextTick()
    if (websiteInputRef.value) {
      websiteInputRef.value.focus()
      const httpsPrefix = 'https://'
      if (newWebsiteValue.value === httpsPrefix || !newWebsiteValue.value.startsWith(httpsPrefix)) {
        await nextTick()
        if (websiteInputRef.value) {
          websiteInputRef.value.setSelectionRange(httpsPrefix.length, httpsPrefix.length)
        }
      } else {
        // If editing existing website, position cursor at end
        await nextTick()
        if (websiteInputRef.value) {
          const len = newWebsiteValue.value.length
          websiteInputRef.value.setSelectionRange(len, len)
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

// Fetch viewer's user type when user is logged in
const fetchViewerUserType = async () => {
  if (!user.value || !supabase) return
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.value.id)
      .single()
    
    if (error) throw error
    
    if (data) {
      viewerUserType.value = (data.user_type as 'creator' | 'audio_pro') || null
    }
  } catch (error) {
    console.error('Error fetching viewer user type:', error)
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
          .select('id, username, display_name, bio, website, social_links, user_type')
          .eq('id', usernameOrId)
          .single()
      } else {
        result = await supabase
          .from('user_profiles')
          .select('id, username, display_name, bio, website, social_links, user_type')
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
      }
    } catch (error) {
      console.error('Error fetching profile client-side:', error)
    }
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
  
  // Ensure viewerUserType is fetched if user is logged in
  if (user.value && !viewerUserType.value) {
    console.log('fetchTracks: Fetching viewerUserType first')
    await fetchViewerUserType()
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
    let data, error
    
    // If viewing own profile AND user is creator, fetch shortlisted tracks
    console.log('fetchTracks: Checking conditions', { 
      isOwnProfile: isOwnProfile.value, 
      viewerUserType: viewerUserType.value, 
      hasUser: !!user.value,
      profileUserId: profileUserId.value,
      userId: user.value?.id
    })
    
    if (isOwnProfile.value && viewerUserType.value === 'creator' && user.value) {
      console.log('fetchTracks: Fetching shortlisted tracks for creator')
      const { getShortlistedTracks } = await import('~/utils/shortlist')
      const result = await getShortlistedTracks(user.value.id)
      
      if (result.error) {
        console.error('fetchTracks: Error fetching shortlisted tracks:', result.error)
        throw result.error
      }
      
      console.log('fetchTracks: Shortlisted tracks result', { count: result.data?.length, data: result.data })
      data = result.data || []
      error = null
      
      // Sort the data
      if (sortBy === 'created_at') {
        data.sort((a: any, b: any) => {
          const aTime = new Date(a.shortlisted_at || a.created_at).getTime()
          const bTime = new Date(b.shortlisted_at || b.created_at).getTime()
          return sortDirection === 'asc' ? aTime - bTime : bTime - aTime
        })
      } else {
        // For other sort fields, use the track's field
        data.sort((a: any, b: any) => {
          const aVal = a[sortBy] || ''
          const bVal = b[sortBy] || ''
          if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
          }
        })
      }
    } else {
      // Normal query: fetch tracks from the profile owner
      console.log('fetchTracks: Using normal query (not shortlist)')
      const result = await supabase
        .from('sounds')
        .select(`
          *,
          track_statuses!status_id(id, name)
        `)
        .eq('user_id', profileUserId.value)
        .order(sortBy, { ascending: sortDirection === 'asc' })
      
      data = result.data
      error = result.error
    }

    console.log('fetchTracks: Query result', { data, error, count: data?.length })
    
    if (error) throw error
    
    // Fetch collection names and slugs for each track
    const tracksWithCollections = await Promise.all((data || []).map(async (track: any) => {
      // For shortlisted tracks (when viewing own profile as creator), only show collections owned by the creator
      // For own tracks, show all collections the track is in
      const isShortlistedTrack = isOwnProfile.value && viewerUserType.value === 'creator' && user.value
      const collectionOwnerId = isShortlistedTrack ? user.value!.id : null
      
      // Get collection IDs for this track
      const { data: junctionData } = await supabase
        .from('collections_sounds')
        .select('collection_id')
        .eq('sound_id', track.id)
      
      const allCollectionIds = (junctionData || []).map((item: any) => item.collection_id)
      
      if (allCollectionIds.length === 0) {
        return {
          ...track,
          collections: [],
          track_status: track.track_statuses
        }
      }
      
      // Get collection names and slugs
      // For shortlisted tracks, filter to only collections owned by the creator
      let collectionQuery = supabase
        .from('collections')
        .select('name, slug, user_id')
        .in('id', allCollectionIds)
      
      const { data: collectionData } = await collectionQuery
      
      // Filter collections by owner if this is a shortlisted track
      const filteredCollections = isShortlistedTrack && collectionOwnerId
        ? (collectionData || []).filter((col: any) => col.user_id === collectionOwnerId).map((col: any) => ({ name: col.name, slug: col.slug }))
        : (collectionData || []).map((col: any) => ({ name: col.name, slug: col.slug }))
      
      return {
        ...track,
        collections: filteredCollections,
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

// Apply filters and sort to tracks
const updateFiltersAndSort = async (params: any) => {
  console.log('Profile page: Applying filters and sort:', params)
  
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
        return { ...track, collections: [], track_status: track.track_statuses }
      }
      
      const { data: collectionData } = await supabase
        .from('collections')
        .select('name, slug')
        .in('id', collectionIds)
      
      return { ...track, collections: collectionData || [], track_status: track.track_statuses }
    }))
    
    tracks.value = tracksWithCollections
  } catch (error) {
    console.error('Error filtering tracks:', error)
  } finally {
    loading.value = false
  }
}

// Set SEO meta tags using useSeoMeta (recommended by Nuxt for SEO)
// Use computed values to ensure reactivity and SSR compatibility
// Note: titleTemplate in nuxt.config will add "| Beatbox" automatically
const seoTitle = computed(() => {
  const profileForSEO = initialData.value?.profile
  const name = profileForSEO?.display_name || profileForSEO?.username || profileName.value || route.params.id
  return name ? `${name}'s Music Library` : 'Music Library'
})

const seoDescription = computed(() => {
  const profileForSEO = initialData.value?.profile
  const tracksForSEO = initialData.value?.tracks || tracks.value
  const name = profileForSEO?.display_name || profileForSEO?.username || profileName.value || route.params.id
  const trackCount = tracksForSEO.length > 0 ? `${tracksForSEO.length}+ tracks` : 'Music collection'
  return name
    ? `Explore ${name}'s music collection on Beatbox - ${trackCount}`
    : 'Explore music collection on Beatbox'
})

const seoUrl = computed(() => {
  const profileForSEO = initialData.value?.profile
  return `${siteUrl}/u/${profileForSEO?.username || username.value || route.params.id}`
})

// Use useSeoMeta with computed values for reactivity and SSR support
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
  loadBioSectionState()
  loadMusicSectionState()
  // Load software section state after checking if software is available
  // Use nextTick to ensure software data is loaded first
  await nextTick()
  loadSoftwareSectionState()
  
  // Register initial context items
  if (registerContextItems && tracks.value.length > 0) {
    registerContextItems(tracks.value, ['title', 'artist'])
  }
  
  // Listen for track updates
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  if (unregisterContextItems) {
    unregisterContextItems()
  }
  
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

