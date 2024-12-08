<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center" v-if="show">
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">Manage Submissions</h2>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">
          <span class="sr-only">Close</span>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-6">
        <div v-if="pendingResources.length === 0" class="text-center py-8 text-gray-500">
          No pending submissions
        </div>

        <div v-for="resource in pendingResources" :key="resource.id" class="border rounded-lg p-4 space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-lg">{{ resource.name }}</h3>
              <p class="text-sm text-gray-600">by {{ resource.creator }}</p>
            </div>
            <span class="px-2 py-1 text-xs rounded-full" :class="{
              'bg-yellow-100 text-yellow-800': resource.status === 'pending',
              'bg-green-100 text-green-800': resource.status === 'approved',
              'bg-red-100 text-red-800': resource.status === 'rejected'
            }">
              {{ resource.status }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-600">Price:</p>
              <p>{{ resource.price }}</p>
            </div>
            <div>
              <p class="text-gray-600">Type:</p>
              <p>{{ resource.type }}</p>
            </div>
            <div>
              <p class="text-gray-600">OS:</p>
              <p>{{ resource.os.join(', ') }}</p>
            </div>
            <div>
              <p class="text-gray-600">Tags:</p>
              <p>{{ resource.tags.join(', ') }}</p>
            </div>
          </div>

          <div>
            <p class="text-gray-600 text-sm">Link:</p>
            <a :href="resource.link" target="_blank" rel="noopener noreferrer" 
               class="text-blue-600 hover:text-blue-800 break-all">
              {{ resource.link }}
            </a>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button @click="rejectResource(resource.id)"
                    class="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200">
              Reject
            </button>
            <button @click="approveResource(resource.id)"
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Resource } from '~/types/resource'
import { useAuth } from '~/composables/useAuth'
import type { SupabaseClient } from '@supabase/supabase-js'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  resourceUpdated: []
}>()

const { $supabase } = useNuxtApp()
const supabase = $supabase as SupabaseClient
const pendingResources = ref<Resource[]>([])

const fetchPendingResources = async () => {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending resources:', error)
    return
  }

  pendingResources.value = data
}

const updateResourceStatus = async (resourceId: number, status: 'approved' | 'rejected') => {
  const { error } = await supabase
    .from('resources')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', resourceId)

  if (error) {
    console.error('Error updating resource status:', error)
    return
  }

  await fetchPendingResources()
  emit('resourceUpdated')
}

const approveResource = (resourceId: number) => updateResourceStatus(resourceId, 'approved')
const rejectResource = (resourceId: number) => updateResourceStatus(resourceId, 'rejected')

onMounted(() => {
  fetchPendingResources()
})

// Refresh the list when the modal is shown
watch(() => props.show, (newValue) => {
  if (newValue) {
    fetchPendingResources()
  }
})
</script> 