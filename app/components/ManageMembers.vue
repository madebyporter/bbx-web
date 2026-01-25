<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <h3 class="font-semibold text-neutral-200">Profile Members</h3>
      <p class="text-sm text-neutral-400">
        Members can view your private tracks on your profile and in collections.
      </p>
    </div>

    <!-- Invite Member Form -->
    <div class="flex flex-col gap-2">
      <label class="text-sm text-neutral-400">Invite Member</label>
      <div class="relative flex gap-2" ref="autocompleteContainer">
        <div class="flex-1 relative">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Search by username or name..."
            class="w-full p-2 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200"
            :class="{ 'border-neutral-600': isDropdownOpen }"
            @focus="openDropdown()"
            @keydown.escape="closeDropdown()"
            @keydown.enter.prevent="handleEnterKey"
            @keydown.down.prevent="navigateDown"
            @keydown.up.prevent="navigateUp"
            @input="handleSearchInput"
          />
          
          <!-- Dropdown -->
          <div 
            v-if="isDropdownOpen && (searchResults.length > 0 || isSearching || searchQuery.trim())" 
            class="absolute z-10 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            <!-- Loading state -->
            <div v-if="isSearching" class="p-3 text-neutral-400 text-center text-sm">
              Searching...
            </div>
            
            <!-- Search results -->
            <div 
              v-else-if="searchResults.length > 0"
              class="py-1"
            >
              <div 
                v-for="(user, index) in searchResults" 
                :key="user.id"
                :class="[
                  'flex flex-col gap-1 p-2 hover:bg-neutral-700 cursor-pointer',
                  selectedIndex === index ? 'bg-neutral-700' : ''
                ]"
                @click="selectUser(user)"
                @mouseenter="selectedIndex = index"
              >
                <div class="text-sm text-neutral-200">
                  {{ user.display_name || user.username || 'Unknown User' }}
                </div>
                <div v-if="user.username" class="text-xs text-neutral-400">
                  @{{ user.username }}
                </div>
              </div>
            </div>
            
            <!-- No results -->
            <div v-else-if="searchQuery.trim()" class="p-3 text-neutral-500 text-center text-sm">
              No users found
            </div>
          </div>
        </div>
        <button
          @click="handleInvite"
          :disabled="isInviting || !selectedUser"
          class="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-neutral-900 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isInviting ? 'Inviting...' : 'Invite' }}
        </button>
      </div>
      <p v-if="inviteError" class="text-xs text-red-500">{{ inviteError }}</p>
      <p v-if="inviteSuccess" class="text-xs text-green-400">{{ inviteSuccess }}</p>
    </div>

    <!-- Members List -->
    <div class="flex flex-col gap-2">
      <div v-if="loading" class="text-sm text-neutral-400">Loading members...</div>
      <div v-else-if="members.length === 0" class="text-sm text-neutral-500">
        No members yet. Invite someone to get started.
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="member in members"
          :key="member.id"
          class="flex items-center justify-between p-3 border border-neutral-800 rounded bg-neutral-900/50"
        >
          <div class="flex flex-col gap-1">
            <div class="text-sm text-neutral-200">{{ member.display_name || member.username || 'Unknown User' }}</div>
            <div class="text-xs text-neutral-500">
              Invited {{ formatDate(member.created_at) }}
            </div>
          </div>
          <button
            @click="handleRemove(member.member_id)"
            :disabled="isRemoving === member.member_id"
            class="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-800 rounded transition-colors disabled:opacity-50"
          >
            {{ isRemoving === member.member_id ? 'Removing...' : 'Remove' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { getProfileMembers, inviteMember, removeMember, searchUsersForInvite, type UserSearchResult } from '~/utils/memberships'

interface Props {
  profileId: string
}

const props = defineProps<Props>()

const { supabase } = useSupabase()
const { user } = useAuth()

const members = ref<Array<{
  id: number
  member_id: string
  created_at: string
  display_name?: string
  username?: string
}>>([])
const loading = ref(false)
const isInviting = ref(false)
const inviteError = ref<string | null>(null)
const inviteSuccess = ref<string | null>(null)
const isRemoving = ref<string | null>(null)

// Autocomplete state
const searchQuery = ref('')
const searchResults = ref<UserSearchResult[]>([])
const isDropdownOpen = ref(false)
const isSearching = ref(false)
const selectedUser = ref<UserSearchResult | null>(null)
const selectedIndex = ref(-1)
const autocompleteContainer = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
let debounceTimer: NodeJS.Timeout | null = null

const fetchMembers = async () => {
  if (!props.profileId) return
  
  loading.value = true
  try {
    const memberData = await getProfileMembers(props.profileId)
    
    // Fetch user profile data for each member to get display names
    const membersWithProfiles = await Promise.all(
      memberData.map(async (member) => {
        try {
          const { data: profileData } = await supabase
            ?.from('user_profiles')
            .select('username, display_name')
            .eq('id', member.member_id)
            .single()
          
          return {
            ...member,
            username: profileData?.username,
            display_name: profileData?.display_name
          }
        } catch (error) {
          console.error('Error fetching member profile:', error)
          return member
        }
      })
    )
    
    members.value = membersWithProfiles
  } catch (error) {
    console.error('Error fetching members:', error)
  } finally {
    loading.value = false
  }
}

// Autocomplete functions
const openDropdown = () => {
  isDropdownOpen.value = true
  if (searchQuery.value.trim()) {
    performSearch()
  }
}

const closeDropdown = () => {
  isDropdownOpen.value = false
  selectedIndex.value = -1
}

const handleSearchInput = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    selectedUser.value = null
    closeDropdown()
    return
  }
  
  openDropdown()
  
  debounceTimer = setTimeout(() => {
    performSearch()
  }, 300)
}

const performSearch = async () => {
  if (!searchQuery.value.trim() || !props.profileId) {
    searchResults.value = []
    return
  }
  
  isSearching.value = true
  try {
    const results = await searchUsersForInvite(props.profileId, searchQuery.value, 20)
    searchResults.value = results
    selectedIndex.value = -1
  } catch (error) {
    console.error('Error searching users:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const selectUser = (user: UserSearchResult) => {
  selectedUser.value = user
  searchQuery.value = user.display_name || user.username || ''
  closeDropdown()
}

const handleEnterKey = () => {
  if (selectedIndex.value >= 0 && searchResults.value[selectedIndex.value]) {
    selectUser(searchResults.value[selectedIndex.value])
  } else if (searchResults.value.length === 1) {
    selectUser(searchResults.value[0])
  }
}

const navigateDown = () => {
  if (searchResults.value.length === 0) return
  selectedIndex.value = Math.min(selectedIndex.value + 1, searchResults.value.length - 1)
}

const navigateUp = () => {
  if (searchResults.value.length === 0) return
  selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
}

const handleClickOutside = (event: Event) => {
  if (!isDropdownOpen.value) return
  
  const target = event.target as Node
  if (autocompleteContainer.value && !autocompleteContainer.value.contains(target)) {
    nextTick(() => {
      if (isDropdownOpen.value) {
        closeDropdown()
      }
    })
  }
}

const handleInvite = async () => {
  if (!selectedUser.value || !user.value) return
  
  isInviting.value = true
  inviteError.value = null
  inviteSuccess.value = null
  
  try {
    await inviteMember(props.profileId, selectedUser.value.id, user.value.id)
    inviteSuccess.value = `${selectedUser.value.display_name || selectedUser.value.username} has been invited.`
    
    // Clear search and selection
    searchQuery.value = ''
    selectedUser.value = null
    searchResults.value = []
    closeDropdown()
    
    // Refresh members list
    await fetchMembers()
  } catch (error: any) {
    console.error('Error inviting member:', error)
    inviteError.value = error.message || 'Failed to invite member. Please try again.'
  } finally {
    isInviting.value = false
  }
}

const handleRemove = async (memberId: string) => {
  if (!confirm('Are you sure you want to remove this member?')) return
  
  isRemoving.value = memberId
  
  try {
    await removeMember(props.profileId, memberId)
    
    // Refresh members list
    await fetchMembers()
  } catch (error: any) {
    console.error('Error removing member:', error)
    alert('Failed to remove member: ' + (error.message || 'Unknown error'))
  } finally {
    isRemoving.value = null
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(() => {
  fetchMembers()
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

