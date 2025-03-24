<template>
  <MasterDrawer :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl font-bold">Manage Submissions</h2>
    </template>
    
    <div class="pt-8">
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
      </div>
      
      <div v-else-if="resources.length === 0" class="text-center py-8">
        <p class="text-neutral-400">No pending submissions</p>
      </div>
      
      <div v-else class="space-y-4">
        <div v-for="resource in resources" :key="resource.id" class="p-4 ring-1 ring-neutral-800 rounded-lg">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold">{{ resource.name }}</h3>
              <p class="text-sm text-neutral-400">by {{ resource.creator }}</p>
            </div>
            <div class="flex gap-2">
              <button 
                @click="approveResource(resource.id)"
                class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Approve
              </button>
              <button 
                @click="rejectResource(resource.id)"
                class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
          <div class="mt-2 text-sm">
            <p><span class="text-neutral-400">Type:</span> {{ resource.type }}</p>
            <p><span class="text-neutral-400">Price:</span> {{ resource.price }}</p>
            <p><span class="text-neutral-400">OS:</span> {{ resource.os?.join(', ') }}</p>
            <p><span class="text-neutral-400">Tags:</span> {{ resource.tags?.join(', ') }}</p>
            <p><span class="text-neutral-400">Link:</span> <a :href="resource.link" target="_blank" class="text-amber-500 hover:text-amber-400">{{ resource.link }}</a></p>
          </div>
        </div>
      </div>
    </div>
  </MasterDrawer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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

onMounted(() => {
  if (props.canEdit) {
    fetchResources()
  }
})
</script> 