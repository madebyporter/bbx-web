<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Edit Track</h2>
    </template>

    <!-- Success Message -->
    <div v-if="showSuccessMessage" class="h-full flex flex-col items-center justify-center text-center gap-4">
      <div class="flex flex-col gap-2">
        <h2 class="text-xl text-green-400">✓ Track updated successfully!</h2>
        <p class="text-sm text-neutral-400">Your changes have been saved.</p>
      </div>
      <div class="flex gap-4 mt-4">
        <button 
          @click="showSuccessMessage = false" 
          class="text-amber-300 hover:text-amber-400 underline cursor-pointer"
        >
          Edit Again
        </button>
        <span class="text-neutral-600">|</span>
        <button 
          @click="handleClose" 
          class="text-amber-300 hover:text-amber-400 underline cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Edit Form -->
    <template v-else>
      <form class="flex flex-col gap-8" @submit.prevent="onSubmit" @click.stop>
        <!-- Track Metadata -->
        <div class="flex flex-col gap-4">
          <h3 class="font-semibold">Track Information</h3>
          
          <!-- Title (full width) -->
          <div class="col-span-2">
            <label class="text-sm text-neutral-400">Title <span class="text-red-500">*</span></label>
            <input 
              v-model="metadata.title"
              type="text"
              required
              class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-neutral-400">Artist</label>
              <input 
                v-model="metadata.artist"
                type="text"
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
              />
            </div>
            <div>
              <label class="text-sm text-neutral-400">Version</label>
              <input 
                v-model="metadata.version"
                type="text"
                placeholder="e.g. v1.0, v2.5"
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
              />
            </div>
            <div>
              <label class="text-sm text-neutral-400">Collection (optional)</label>
              <input 
                v-model="metadata.collection_name"
                type="text"
                placeholder="e.g. My Beats 2024"
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
              />
            </div>
            <div>
              <label class="text-sm text-neutral-400">Genre</label>
              <input 
                v-model="metadata.genre"
                type="text"
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
              />
            </div>
            <div>
              <label class="text-sm text-neutral-400">BPM</label>
              <input 
                v-model.number="metadata.bpm"
                type="number"
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
              />
            </div>
            <div>
              <label class="text-sm text-neutral-400">Year</label>
              <input 
                v-model.number="metadata.year"
                type="number"
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
              />
            </div>
            <div>
              <label class="text-sm text-neutral-400">Mood</label>
              <input 
                v-model="metadata.mood"
                type="text"
                placeholder="e.g. Dark, Happy"
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
              />
            </div>
          </div>
          
          <!-- Delete Button -->
          <div class="pt-4 border-t border-neutral-800">
            <button 
              type="button"
              @click="handleDelete"
              class="text-red-500 hover:text-red-400 text-sm"
            >
              Delete Track
            </button>
          </div>
        </div>

        <!-- Update Button -->
        <button 
          type="submit" 
          class="btn"
          :disabled="isUpdating"
        >
          {{ isUpdating ? 'Updating...' : 'Update Track' }}
        </button>

        <!-- Error Message -->
        <div v-if="error" class="text-red-500 text-sm">
          {{ error }}
        </div>
      </form>
    </template>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import MasterDrawer from './MasterDrawer.vue'

interface Props {
  show: boolean
  trackToEdit: any | null
}

const props = defineProps<Props>()
const emit = defineEmits(['update:show', 'track-updated'])

interface TrackMetadata {
  title: string
  artist: string
  version: string
  collection_name: string
  genre: string
  mood: string
  bpm: number | null
  year: number | null
}

const { supabase } = useSupabase()
const { user } = useAuth()

const drawerRef = ref<any>(null)
const isUpdating = ref(false)
const showSuccessMessage = ref(false)
const error = ref<string | null>(null)

const metadata = ref<TrackMetadata>({
  title: '',
  artist: '',
  version: 'v1.0',
  collection_name: '',
  genre: '',
  mood: '',
  bpm: null,
  year: null
})

// Watch for trackToEdit changes to populate form
watch(() => props.trackToEdit, (newTrack) => {
  if (newTrack) {
    const moodString = Array.isArray(newTrack.mood) 
      ? newTrack.mood.join(', ') 
      : (newTrack.mood || '')
    
    metadata.value = {
      title: newTrack.title || '',
      artist: newTrack.artist || '',
      version: newTrack.version || 'v1.0',
      collection_name: '', // TODO: Get from collection_id
      genre: newTrack.genre || '',
      mood: moodString,
      bpm: newTrack.bpm || null,
      year: newTrack.year || null
    }
  }
}, { immediate: true })

const onSubmit = async () => {
  if (!supabase || !user.value || !props.trackToEdit) {
    console.error('EditTrack: Missing requirements', { supabase: !!supabase, user: !!user.value, track: !!props.trackToEdit })
    return
  }
  
  isUpdating.value = true
  error.value = null
  
  try {
    // Parse mood (comma-separated to array)
    const moodArray = metadata.value.mood 
      ? metadata.value.mood.split(',').map(m => m.trim()).filter(m => m)
      : null
    
    console.log('EditTrack: Updating track with data:', {
      id: props.trackToEdit.id,
      title: metadata.value.title,
      artist: metadata.value.artist,
      user_id: props.trackToEdit.user_id,
      current_user_id: user.value.id
    })
    
    const { data, error: updateError } = await supabase
      .from('sounds')
      .update({
        title: metadata.value.title || null,
        artist: metadata.value.artist || null,
        version: metadata.value.version || 'v1.0',
        genre: metadata.value.genre || null,
        mood: moodArray,
        bpm: metadata.value.bpm,
        year: metadata.value.year
      })
      .eq('id', props.trackToEdit.id)
      .select()
    
    if (updateError) {
      console.error('EditTrack: Update error:', updateError)
      throw updateError
    }
    
    console.log('EditTrack: Update successful', data)
    showSuccessMessage.value = true
    emit('track-updated')
    
  } catch (err: any) {
    console.error('EditTrack: Error updating track:', err)
    error.value = 'Failed to update track: ' + (err.message || 'Unknown error')
  } finally {
    isUpdating.value = false
  }
}

const handleClose = () => {
  if (drawerRef.value?.animateOut) {
    drawerRef.value.animateOut()
  }
}

const handleDelete = async () => {
  if (!supabase || !props.trackToEdit || !confirm('Are you sure you want to delete this track?')) return
  
  try {
    // Delete from storage
    if (props.trackToEdit.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('sounds')
        .remove([props.trackToEdit.storage_path])
      
      if (storageError) throw storageError
    }
    
    // Delete from database
    const { error: dbError } = await supabase
      .from('sounds')
      .delete()
      .eq('id', props.trackToEdit.id)
    
    if (dbError) throw dbError
    
    emit('track-updated')
    handleClose() // Close modal with animation
    
  } catch (err: any) {
    console.error('Delete error:', err)
    error.value = 'Failed to delete track: ' + err.message
  }
}
</script>

