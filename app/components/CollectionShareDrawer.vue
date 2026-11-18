<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Share collection</h2>
    </template>

    <div class="flex flex-col gap-8 grow">
      <!-- Invite Visitors -->
      <section class="flex flex-col gap-4 border-b border-neutral-800 pb-8">
        <h3 class="text-xl font-semibold text-neutral-100">Invite Visitors</h3>

        <div class="flex flex-col gap-3">
          <label class="font-semibold text-neutral-200">Shareable Link</label>
          <div class="flex flex-col gap-2">
            <div class="flex gap-2">
              <input
                :value="inviteLink"
                type="text"
                readonly
                class="flex-1 p-3 border border-neutral-700 rounded bg-neutral-900 text-neutral-200 text-sm"
              />
              <Button variant="secondary" @click="copyLink">
                {{ linkCopied ? 'Copied!' : 'Copy' }}
              </Button>
            </div>
            <p class="text-xs text-neutral-500">
              Share this link with others. They can click it to join this collection.
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <label class="font-semibold text-neutral-200">Email this link</label>
          <div class="flex gap-2">
            <input
              v-model="emailInput"
              type="text"
              placeholder="email@example.com, another@example.com"
              class="flex-1 p-2 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200"
              :disabled="isSendingEmail"
              @keydown.enter.prevent="handleSendEmail"
            />
            <Button
              :disabled="isSendingEmail || !emailInput.trim()"
              @click="handleSendEmail"
            >
              {{ isSendingEmail ? 'Sending...' : 'Send' }}
            </Button>
          </div>
          <p class="text-xs text-neutral-500">
            Comma-separated emails. Up to 10 recipients.
          </p>
          <p v-if="emailError" class="text-xs text-red-500">{{ emailError }}</p>
          <p v-if="emailSuccess" class="text-xs text-green-400">{{ emailSuccess }}</p>
        </div>
      </section>

      <!-- Invite Members -->
      <section class="flex flex-col gap-4">
        <h3 class="text-xl font-semibold text-neutral-100">Invite Members</h3>

        <div class="flex flex-col gap-3">
          <label class="font-semibold text-neutral-200">Invite by username</label>
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

              <div
                v-if="isDropdownOpen && (searchResults.length > 0 || isSearching || searchQuery.trim())"
                class="absolute z-10 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
              >
                <div v-if="isSearching" class="p-3 text-neutral-400 text-center text-sm">
                  Searching...
                </div>
                <div
                  v-else-if="searchResults.length > 0"
                  class="py-1"
                >
                  <div
                    v-for="(result, index) in searchResults"
                    :key="result.id"
                    :class="[
                      'flex flex-col gap-1 p-2 hover:bg-neutral-700 cursor-pointer',
                      selectedIndex === index ? 'bg-neutral-700' : ''
                    ]"
                    @click="selectUser(result)"
                    @mouseenter="selectedIndex = index"
                  >
                    <div class="text-sm text-neutral-200">
                      {{ result.display_name || result.username || 'Unknown User' }}
                    </div>
                    <div v-if="result.username" class="text-xs text-neutral-400">
                      @{{ result.username }}
                    </div>
                  </div>
                </div>
                <div v-else-if="searchQuery.trim()" class="p-3 text-neutral-500 text-center text-sm">
                  No users found
                </div>
              </div>
            </div>
            <Button
              :disabled="isInviting || !selectedUser"
              @click="handleInvite"
            >
              {{ isInviting ? 'Inviting...' : 'Invite' }}
            </Button>
          </div>
          <p v-if="inviteError" class="text-xs text-red-500">{{ inviteError }}</p>
          <p v-if="inviteSuccess" class="text-xs text-green-400">{{ inviteSuccess }}</p>
        </div>

        <div class="flex flex-col gap-2">
          <label class="font-semibold text-neutral-200">Members</label>
          <div v-if="loadingMembers" class="text-sm text-neutral-400">Loading members...</div>
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
              <Button
                variant="ghost"
                size="sm"
                class="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-800 bg-transparent"
                :disabled="isRemoving === member.member_id"
                @click="handleRemove(member.member_id)"
              >
                {{ isRemoving === member.member_id ? 'Removing...' : 'Remove' }}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { useAnalytics } from '~/composables/useAnalytics'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import { markCollectionShareDone } from '~/composables/useOnboardingChecklist'
import MasterDrawer from '~/components/MasterDrawer.vue'
import {
  searchUsersForCollectionInvite,
  inviteCollectionMember,
  removeCollectionMember,
  getCollectionMembers,
  generateCollectionInviteLink,
  type CollectionMember
} from '~/utils/collections'
import type { UserSearchResult } from '~/types/userSearch'

interface Props {
  show: boolean
  collectionId: number
  collectionName?: string
}

const props = withDefaults(defineProps<Props>(), {
  collectionName: '',
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'members-updated': []
  'share-completed': []
}>()

const { supabase } = useSupabase()
const { user } = useAuth()
const { showSuccess, showError } = useToast()
const { capture } = useAnalytics()

const drawerRef = ref<InstanceType<typeof MasterDrawer> | null>(null)

const searchQuery = ref('')
const searchResults = ref<UserSearchResult[]>([])
const isDropdownOpen = ref(false)
const isSearching = ref(false)
const selectedUser = ref<UserSearchResult | null>(null)
const selectedIndex = ref(-1)
const autocompleteContainer = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const members = ref<Array<CollectionMember & { display_name?: string; username?: string }>>([])
const loadingMembers = ref(false)
const isInviting = ref(false)
const inviteError = ref<string | null>(null)
const inviteSuccess = ref<string | null>(null)
const isRemoving = ref<string | null>(null)

const inviteLink = ref('')
const linkCopied = ref(false)

const emailInput = ref('')
const isSendingEmail = ref(false)
const emailError = ref<string | null>(null)
const emailSuccess = ref<string | null>(null)

function signalShareDone() {
  markCollectionShareDone(user.value?.id)
  emit('share-completed')
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bbx-onboarding-refresh'))
  }
}

const openDropdown = () => {
  isDropdownOpen.value = true
  if (searchQuery.value.trim()) {
    void performSearch()
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
    void performSearch()
  }, 300)
}

const performSearch = async () => {
  if (!searchQuery.value.trim() || !props.collectionId) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  try {
    const results = await searchUsersForCollectionInvite(props.collectionId, searchQuery.value, 20)
    searchResults.value = results
    selectedIndex.value = -1
  } catch (error) {
    console.error('Error searching users:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const selectUser = (result: UserSearchResult) => {
  selectedUser.value = result
  searchQuery.value = result.display_name || result.username || ''
  closeDropdown()
}

const handleEnterKey = () => {
  const indexed = selectedIndex.value >= 0 ? searchResults.value[selectedIndex.value] : undefined
  if (indexed) {
    selectUser(indexed)
    return
  }
  const only = searchResults.value.length === 1 ? searchResults.value[0] : undefined
  if (only) {
    selectUser(only)
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
    await inviteCollectionMember(props.collectionId, selectedUser.value.id, user.value.id)
    capture('collection_invite_sent', {
      collection_id: props.collectionId,
      method: 'user_search',
    })
    inviteSuccess.value = `${selectedUser.value.display_name || selectedUser.value.username} has been invited.`

    searchQuery.value = ''
    selectedUser.value = null
    searchResults.value = []
    closeDropdown()

    await fetchMembers()
    signalShareDone()
  } catch (error: any) {
    console.error('Error inviting member:', error)
    inviteError.value = error.message || 'Failed to invite member. Please try again.'
  } finally {
    isInviting.value = false
  }
}

const fetchMembers = async () => {
  if (!props.collectionId) return

  loadingMembers.value = true
  try {
    const memberData = await getCollectionMembers(props.collectionId)

    const membersWithProfiles = await Promise.all(
      memberData.map(async (member) => {
        try {
          if (!supabase) return member
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('username, display_name')
            .eq('id', member.member_id)
            .maybeSingle()

          return {
            ...member,
            username: typeof profileData?.username === 'string' ? profileData.username : undefined,
            display_name: typeof profileData?.display_name === 'string' ? profileData.display_name : undefined,
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
    loadingMembers.value = false
  }
}

const handleRemove = async (memberId: string) => {
  if (!confirm('Are you sure you want to remove this member?')) return

  isRemoving.value = memberId

  try {
    await removeCollectionMember(props.collectionId, memberId)
    await fetchMembers()
    emit('members-updated')
  } catch (error: any) {
    console.error('Error removing member:', error)
    showError('Failed to remove member: ' + (error.message || 'Unknown error'))
  } finally {
    isRemoving.value = null
  }
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    linkCopied.value = true
    capture('collection_invite_link_copied', { collection_id: props.collectionId })
    showSuccess('Link copied to clipboard')
    signalShareDone()
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Error copying link:', error)
    showError('Failed to copy link')
  }
}

function parseEmails(raw: string): string[] {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const parts = raw
    .split(/[,;\s]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  const unique = [...new Set(parts)]
  return unique.filter((email) => EMAIL_RE.test(email))
}

const handleSendEmail = async () => {
  emailError.value = null
  emailSuccess.value = null

  const emails = parseEmails(emailInput.value)
  if (emails.length === 0) {
    emailError.value = 'Enter at least one valid email address.'
    return
  }
  if (emails.length > 10) {
    emailError.value = 'You can send to at most 10 emails at once.'
    return
  }

  isSendingEmail.value = true
  try {
    const headers = await useAuthHeaders()
    if (!headers.Authorization) {
      throw new Error('You must be signed in to send emails.')
    }

    await $fetch('/api/collections/share-email', {
      method: 'POST',
      headers,
      body: {
        collectionId: props.collectionId,
        emails,
      },
    })

    capture('collection_share_email_sent', {
      collection_id: props.collectionId,
      recipient_count: emails.length,
    })
    emailSuccess.value = `Sent to ${emails.length} recipient${emails.length === 1 ? '' : 's'}.`
    emailInput.value = ''
    showSuccess('Share email sent')
    signalShareDone()
  } catch (error: any) {
    console.error('Error sending share email:', error)
    const message = error?.data?.statusMessage || error?.statusMessage || error?.message || 'Failed to send email'
    emailError.value = message
    showError(message)
  } finally {
    isSendingEmail.value = false
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

watch(() => props.show, (newVal) => {
  if (newVal && props.collectionId) {
    void fetchMembers()
    inviteLink.value = generateCollectionInviteLink(props.collectionId)
    emailError.value = null
    emailSuccess.value = null
    inviteError.value = null
    inviteSuccess.value = null
  }
}, { immediate: true })

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>
