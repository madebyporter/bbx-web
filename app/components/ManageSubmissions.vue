<template>
  <MasterDrawer :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Admin</h2>
    </template>
    
    <div class="flex flex-col gap-4 *:border *:border-neutral-800 *:p-4 *:rounded-md">
      <AdminAccordionSection
        v-model="openPlans"
        title="Plans and billing"
      >
        <AdminPlans :active="props.show && props.canEdit" />
      </AdminAccordionSection>

      <AdminAccordionSection
        v-model="openResources"
        title="Manage Resources"
        :show-new="hasNewResources"
      >
        <div v-if="loading" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
        </div>
        
        <div v-else-if="!canEdit" class="text-center py-8">
          <p class="text-neutral-400">You don't have permission to manage submissions</p>
        </div>
        
        <div v-else-if="resources.length === 0" class="text-center py-8">
          <p class="text-neutral-400">No pending submissions</p>
        </div>
        
        <div v-else class="flex flex-col gap-4">
          <!-- Submission Card -->
          <div 
            v-for="resource in resources" 
            :key="resource.id" 
            class="flex flex-col border border-neutral-800 rounded-lg p-4 overflow-hidden"
          >
            <!-- Submission Content -->
            <div class="flex flex-col gap-4">
              <!-- Image -->
              <div class="w-full h-auto rounded-md overflow-hidden bg-neutral-900">
                <img 
                  v-if="resource.image_url"
                  :src="resource.image_url" 
                  :alt="resource.name"
                  class="w-full h-full aspect-4/3 object-cover"
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
            <div class="flex flex-col gap-3 p-4 bg-neutral-900 border-t border-neutral-800">
              <Button
                variant="secondary"
                class="w-full"
                @click="editResource(resource)"
              >
                Edit
              </Button>
              <div class="flex gap-3">
                <Button
                  class="flex-1 bg-green-600 text-white hover:bg-green-700"
                  @click="approveResource(resource.id)"
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  class="flex-1"
                  @click="rejectResource(resource.id)"
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AdminAccordionSection>

      <AdminAccordionSection
        v-model="openUsers"
        title="Manage Users"
        :show-new="hasNewUsers"
      >
        <div v-if="loadingUsers" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
        </div>
        
        <div v-else-if="!canEdit" class="text-center py-8">
          <p class="text-neutral-400">You don't have permission to manage users</p>
        </div>
        
        <div v-else class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1 border border-neutral-800 rounded-lg p-4">
              <p class="text-sm text-neutral-400">{{ quarterNewUsersTitle }}</p>
              <p class="text-2xl font-semibold text-white">{{ quarterNewUsers }}</p>
              <p class="text-xs text-neutral-500">{{ quarterCompareLabel }}</p>
            </div>
            <div class="flex flex-col gap-1 border border-neutral-800 rounded-lg p-4">
              <p class="text-sm text-neutral-400">Monthly active users</p>
              <p class="text-2xl font-semibold text-white">{{ mau }}</p>
              <p class="text-xs text-neutral-500">{{ mauCompareLabel }}</p>
            </div>
          </div>

          <div v-if="users.length === 0" class="text-center py-8">
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
      </AdminAccordionSection>
    </div>
  </MasterDrawer>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue'
import { useSupabase } from '~/utils/supabase'
import MasterDrawer from './MasterDrawer.vue'

const NEW_USER_DAYS = 7

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
const handleEdit = inject('handleEdit')

const resources = ref([])
const loading = ref(true)
const users = ref([])
const loadingUsers = ref(false)

const openPlans = ref(false)
const openResources = ref(false)
const openUsers = ref(false)

const hasNewResources = computed(() => resources.value.length > 0)

const hasNewUsers = computed(() => {
  const cutoff = Date.now() - NEW_USER_DAYS * 24 * 60 * 60 * 1000
  return users.value.some((user) => {
    if (!user.created_at) return false
    const created = new Date(user.created_at).getTime()
    return !Number.isNaN(created) && created >= cutoff
  })
})

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function quarterIndex(date) {
  return Math.floor(date.getMonth() / 3)
}

function quarterLabel(year, qIndex) {
  return `Q${qIndex + 1}`
}

function quarterBounds(year, qIndex) {
  const start = new Date(year, qIndex * 3, 1)
  const end = new Date(year, qIndex * 3 + 3, 1)
  return { start, end }
}

function previousQuarter(year, qIndex) {
  if (qIndex === 0) return { year: year - 1, qIndex: 3 }
  return { year, qIndex: qIndex - 1 }
}

function monthBounds(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  return { start, end }
}

function previousMonth(year, month) {
  if (month === 0) return { year: year - 1, month: 11 }
  return { year, month: month - 1 }
}

function countInRange(list, field, start, end) {
  return list.reduce((count, user) => {
    const raw = user[field]
    if (!raw) return count
    const t = new Date(raw).getTime()
    if (Number.isNaN(t)) return count
    if (t >= start.getTime() && t < end.getTime()) return count + 1
    return count
  }, 0)
}

function signedCompareLabel(current, previous, vsLabel) {
  const delta = current - previous
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta} vs ${vsLabel}`
}

const now = computed(() => new Date())

const currentQuarterMeta = computed(() => {
  const d = now.value
  const year = d.getFullYear()
  const qIndex = quarterIndex(d)
  return { year, qIndex, ...quarterBounds(year, qIndex) }
})

const previousQuarterMeta = computed(() => {
  const { year, qIndex } = currentQuarterMeta.value
  const prev = previousQuarter(year, qIndex)
  return { ...prev, ...quarterBounds(prev.year, prev.qIndex) }
})

const currentMonthMeta = computed(() => {
  const d = now.value
  const year = d.getFullYear()
  const month = d.getMonth()
  return { year, month, ...monthBounds(year, month) }
})

const previousMonthMeta = computed(() => {
  const { year, month } = currentMonthMeta.value
  const prev = previousMonth(year, month)
  return { ...prev, ...monthBounds(prev.year, prev.month) }
})

const quarterNewUsersTitle = computed(() => {
  const { year, qIndex } = currentQuarterMeta.value
  return `${quarterLabel(year, qIndex)} New Users`
})

const quarterNewUsers = computed(() => {
  const { start, end } = currentQuarterMeta.value
  return countInRange(users.value, 'created_at', start, end)
})

const prevQuarterNewUsers = computed(() => {
  const { start, end } = previousQuarterMeta.value
  return countInRange(users.value, 'created_at', start, end)
})

const quarterCompareLabel = computed(() => {
  const { year, qIndex } = previousQuarterMeta.value
  return signedCompareLabel(
    quarterNewUsers.value,
    prevQuarterNewUsers.value,
    quarterLabel(year, qIndex),
  )
})

const mau = computed(() => {
  const { start, end } = currentMonthMeta.value
  return countInRange(users.value, 'last_sign_in_at', start, end)
})

const prevMau = computed(() => {
  const { start, end } = previousMonthMeta.value
  return countInRange(users.value, 'last_sign_in_at', start, end)
})

const mauCompareLabel = computed(() => {
  const { month } = previousMonthMeta.value
  return signedCompareLabel(mau.value, prevMau.value, MONTH_SHORT[month])
})

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

const editResource = (resource) => {
  if (!handleEdit) return
  handleEdit({
    id: resource.id,
    name: resource.name,
    slug: resource.slug,
    creator: resource.creator,
    price: resource.price,
    link: resource.link,
    description: resource.description ?? null,
    image_url: resource.image_url,
    os: resource.os || [],
    tags: resource.tags || [],
    type: resource.resource_types,
  })
  emit('update:show', false)
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
    }

    // Fallback: fetch from user_profiles (works without the migration)
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, created_at')
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
      last_sign_in_at: null,
      created_at: profile.created_at || null
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

function syncOpenFromNew() {
  if (hasNewResources.value) openResources.value = true
  if (hasNewUsers.value) openUsers.value = true
}

// Fetch pending submissions once admin auth is ready (isAdmin can load after mount)
watch(
  () => props.canEdit,
  (canEdit) => {
    if (canEdit) {
      fetchResources()
      if (props.show) {
        fetchUsers()
      }
    } else {
      loading.value = false
      resources.value = []
    }
  },
  { immediate: true }
)

// Refetch when drawer opens so queue stays current
watch(() => props.show, (newVal) => {
  if (newVal && props.canEdit) {
    fetchResources()
    fetchUsers()
  }
})

watch([hasNewResources, hasNewUsers], () => {
  syncOpenFromNew()
})
</script>
