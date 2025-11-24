<template>
  <MasterDrawer :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Admin</h2>
    </template>
    
    <div class="pt-8 space-y-12">
      <!-- Manage Submissions Section -->
      <div>
        <h2 class="text-xl font-semibold mb-6">Manage Submissions</h2>
        
        <div v-if="loading" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
        </div>
        
        <div v-else-if="!canEdit" class="text-center py-8">
          <p class="text-neutral-400">You don't have permission to manage submissions</p>
        </div>
        
        <div v-else-if="resources.length === 0" class="text-center py-8">
          <p class="text-neutral-400">No pending submissions</p>
        </div>
        
        <div v-else class="space-y-6">
          <!-- Submission Card -->
          <div 
            v-for="resource in resources" 
            :key="resource.id" 
            class="flex flex-col border border-neutral-800 rounded-lg p-4 overflow-hidden"
          >
            <!-- Submission Content -->
            <div class="flex flex-col lg:flex-row gap-6 p-6">
              <!-- Image -->
              <div class="w-[160px] h-[160px] aspect-square rounded-md overflow-hidden bg-neutral-900">
                <img 
                  v-if="resource.image_url"
                  :src="resource.image_url" 
                  :alt="resource.name"
                  class="w-full h-full aspect-square object-cover"
                />
                <div 
                  v-else 
                  class="w-full h-full flex items-center justify-center text-neutral-600"
                >
                  No image
                </div>
              </div>

              <!-- Meta Information -->
              <div class="flex-1">
                <h3 class="text-xl font-semibold">{{ resource.name }}</h3>
                <p class="text-neutral-400 mt-1">by {{ resource.creator }}</p>
                
                <div class="mt-4 space-y-2 text-sm">
                  <p>
                    <span class="text-neutral-400">Type:</span> 
                    <span class="text-white">{{ resource.type }}</span>
                  </p>
                  <p>
                    <span class="text-neutral-400">Price:</span> 
                    <span class="text-white">{{ resource.price }}</span>
                  </p>
                  <p>
                    <span class="text-neutral-400">OS:</span> 
                    <span class="text-white">{{ resource.os?.join(', ') }}</span>
                  </p>
                  <p>
                    <span class="text-neutral-400">Tags:</span> 
                    <span class="text-white">{{ resource.tags?.join(', ') }}</span>
                  </p>
                  <p>
                    <span class="text-neutral-400">Link:</span> 
                    <a 
                      :href="resource.link" 
                      target="_blank" 
                      class="text-amber-500 hover:text-amber-400"
                    >
                      {{ resource.link }}
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <!-- Submission Actions -->
            <div class="flex gap-3 p-4 bg-neutral-900 border-t border-neutral-800">
              <button 
                @click="approveResource(resource.id)"
                class="flex-1 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
              <button 
                @click="rejectResource(resource.id)"
                class="flex-1 py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Manage Users Section -->
      <div>
        <h2 class="text-xl font-semibold mb-6">Manage Users</h2>
        
        <div v-if="loadingUsers" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
        </div>
        
        <div v-else-if="!canEdit" class="text-center py-8">
          <p class="text-neutral-400">You don't have permission to manage users</p>
        </div>
        
        <div v-else-if="users.length === 0" class="text-center py-8">
          <p class="text-neutral-400">No users found</p>
        </div>
        
        <div v-else class="grid grid-cols-1 gap-4">
          <div
            v-for="user in users"
            :key="user.id"
            class="border border-neutral-800 rounded-lg p-4"
          >
            <div class="flex flex-col gap-2">
              <NuxtLink
                :to="user.username ? `/u/${user.username}` : `/u/${user.id}`"
                class="font-medium text-white hover:text-amber-400 transition-colors"
              >
                {{ user.display_name || user.username || user.email || 'Unknown User' }}
              </NuxtLink>
              <div v-if="user.last_sign_in_at" class="text-sm text-neutral-400">
                <span class="text-neutral-500">Last logged in:</span> {{ formatDate(user.last_sign_in_at) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MasterDrawer>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useSupabase } from '~/utils/supabase'
import MasterDrawer from './MasterDrawer.vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  canEdit: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:show'])
const { supabase } = useSupabase()

const resources = ref([])
const loading = ref(true)
const users = ref([])
const loadingUsers = ref(false)

const fetchResources = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        creators (
          name
        ),
        resource_tags (
          tags (
            name
          )
        ),
        resource_types (
          id,
          slug,
          display_name
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Transform the data to include tags array, creator name, and type
    resources.value = (data || []).map(resource => ({
      ...resource,
      creator: resource.creators?.name || 'Unknown',
      tags: resource.resource_tags?.map(rt => rt.tags.name) || [],
      type: resource.resource_types?.display_name || 'Unknown'
    }))
  } catch (error) {
    console.error('Error fetching resources:', error)
  } finally {
    loading.value = false
  }
}

const approveResource = async (id) => {
  try {
    const { error } = await supabase
      .from('resources')
      .update({ status: 'approved' })
      .eq('id', id)

    if (error) throw error
    await fetchResources()
  } catch (error) {
    console.error('Error approving resource:', error)
  }
}

const rejectResource = async (id) => {
  try {
    const { error } = await supabase
      .from('resources')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (error) throw error
    await fetchResources()
  } catch (error) {
    console.error('Error rejecting resource:', error)
  }
}

const fetchUsers = async () => {
  if (!props.canEdit) return

  loadingUsers.value = true
  try {
    // First, try to call RPC function to get users with last_sign_in_at
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_users_with_last_sign_in')

    if (!rpcError && rpcData) {
      // If RPC returns JSON array, use it directly
      if (Array.isArray(rpcData)) {
        users.value = rpcData
      } else {
        // If it returns a single JSON object, parse it
        users.value = Array.isArray(rpcData) ? rpcData : [rpcData]
      }
      loadingUsers.value = false
      return
    }

    // If RPC error (function doesn't exist or permission denied), fall back to basic user list
    if (rpcError) {
      console.log('RPC function error, falling back to user_profiles:', rpcError.message)
    }

    // Fallback: fetch from user_profiles (works without the migration)
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, username, display_name')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
      throw profilesError
    }

    // Map profiles to user format (without last_sign_in_at until migration is run)
    users.value = (profilesData || []).map(profile => ({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      email: null,
      last_sign_in_at: null
    }))
  } catch (error) {
    console.error('Error fetching users:', error)
    users.value = []
  } finally {
    loadingUsers.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'Never'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return 'Invalid date'
  }
}

// Watch for drawer open to fetch users
watch(() => props.show, (newVal) => {
  if (newVal && props.canEdit) {
    fetchUsers()
  }
})

onMounted(() => {
  if (props.canEdit) {
    fetchResources()
    if (props.show) {
      fetchUsers()
    }
  } else {
    loading.value = false
  }
})
</script> 