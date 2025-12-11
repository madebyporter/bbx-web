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
      <div class="flex gap-2">
        <input
          v-model="inviteInput"
          type="text"
          placeholder="Enter username or email"
          class="flex-1 p-2 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200"
          @keyup.enter="handleInvite"
        />
        <button
          @click="handleInvite"
          :disabled="isInviting || !inviteInput.trim()"
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
import { ref, onMounted } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { getProfileMembers, inviteMember, removeMember, getUserProfileByIdentifier } from '~/utils/memberships'

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
const inviteInput = ref('')
const isInviting = ref(false)
const inviteError = ref<string | null>(null)
const inviteSuccess = ref<string | null>(null)
const isRemoving = ref<string | null>(null)

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

const handleInvite = async () => {
  if (!inviteInput.value.trim() || !user.value || !supabase) return
  
  isInviting.value = true
  inviteError.value = null
  inviteSuccess.value = null
  
  try {
    // Find user by username or email
    const userProfile = await getUserProfileByIdentifier(inviteInput.value.trim())
    
    if (!userProfile) {
      inviteError.value = 'User not found. Please check the username or email.'
      return
    }
    
    if (userProfile.id === props.profileId) {
      inviteError.value = 'You cannot invite yourself.'
      return
    }
    
    // Check if already a member
    const existingMember = members.value.find(m => m.member_id === userProfile.id)
    if (existingMember) {
      inviteError.value = 'This user is already a member.'
      return
    }
    
    await inviteMember(props.profileId, userProfile.id, user.value.id)
    inviteSuccess.value = `${userProfile.display_name || userProfile.username} has been invited.`
    inviteInput.value = ''
    
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
})
</script>

