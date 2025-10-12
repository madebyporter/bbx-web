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
            <div class="col-span-2">
              <label class="text-sm text-neutral-400">Track Group</label>
              <input
                v-model="metadata.track_group_name"
                type="text"
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                placeholder="e.g., art-dealer-dark"
              />
              <p class="text-xs text-neutral-500 mt-1">
                Groups related tracks/versions together. Changes affect this track only.
              </p>
            </div>
            <div class="col-span-2">
              <label class="text-sm text-neutral-400">Collections (optional)</label>
              <select 
                multiple
                v-model="selectedCollectionIds"
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 min-h-[100px]"
              >
                <option v-for="c in collections" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
              <p class="text-xs text-neutral-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              
              <button 
                type="button"
                @click="showCreateCollection = !showCreateCollection"
                class="text-xs text-amber-400 hover:text-amber-300 mt-2"
              >
                {{ showCreateCollection ? '- Cancel' : '+ Create New Collection' }}
              </button>
              
              <div v-if="showCreateCollection" class="mt-3 p-3 border border-neutral-700 rounded bg-neutral-900/50">
                <div class="flex flex-col gap-2">
                  <input 
                    v-model="newCollection.name"
                    type="text"
                    placeholder="Collection name (required)"
                    class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                  />
                  <textarea 
                    v-model="newCollection.description"
                    placeholder="Description (optional)"
                    rows="2"
                    class="w-full p-2 text-sm border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                  />
                  <button 
                    type="button"
                    @click="createCollection"
                    class="btn-sm self-start"
                    :disabled="!newCollection.name.trim()"
                  >
                    Create & Select
                  </button>
                </div>
              </div>
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
import { ref, watch, onMounted } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import MasterDrawer from './MasterDrawer.vue'
import { generateSlug, generateUniqueSlug } from '~/utils/collections'

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
  track_group_name: string
  collection_name: string
  genre: string
  mood: string
  bpm: number | null
  year: number | null
}

interface Collection {
  id: number
  name: string
  slug: string
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

const collections = ref<Collection[]>([])
const selectedCollectionIds = ref<number[]>([])
const showCreateCollection = ref(false)
const newCollection = ref({
  name: '',
  description: ''
})

// Define functions before watch to avoid hoisting issues
const loadTrackCollections = async (trackId: number) => {
  if (!supabase) return
  
  try {
    const { data, error } = await supabase
      .from('collections_sounds')
      .select('collection_id')
      .eq('sound_id', trackId)
    
    if (error) throw error
    selectedCollectionIds.value = (data || []).map(item => item.collection_id)
  } catch (error) {
    console.error('Error loading track collections:', error)
    selectedCollectionIds.value = []
  }
}

const fetchCollections = async () => {
  if (!supabase || !user.value) return
  
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, slug')
      .eq('user_id', user.value.id)
      .order('name')
    
    if (error) throw error
    collections.value = data || []
  } catch (error) {
    console.error('Error fetching collections:', error)
    collections.value = []
  }
}

const createCollection = async () => {
  if (!supabase || !user.value || !newCollection.value.name.trim()) return
  
  try {
    // Get existing slugs to ensure uniqueness
    const { data: existing } = await supabase
      .from('collections')
      .select('slug')
      .eq('user_id', user.value.id)
    
    const existingSlugs = (existing || []).map(c => c.slug)
    const slug = generateUniqueSlug(newCollection.value.name, existingSlugs)
    
    // Create the collection
    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.value.id,
        name: newCollection.value.name.trim(),
        description: newCollection.value.description.trim() || null,
        slug
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Add to collections list
    collections.value.push({
      id: data.id,
      name: data.name,
      slug: data.slug
    })
    
    // Auto-select the new collection
    if (!selectedCollectionIds.value.includes(data.id)) {
      selectedCollectionIds.value.push(data.id)
    }
    
    // Reset form
    newCollection.value.name = ''
    newCollection.value.description = ''
    showCreateCollection.value = false
    
  } catch (err: any) {
    console.error('Error creating collection:', err)
    error.value = 'Failed to create collection: ' + err.message
  }
}

const syncCollections = async (trackId: number) => {
  if (!supabase) return
  
  try {
    // Get current collection IDs for this track
    const { data: current, error: fetchError } = await supabase
      .from('collections_sounds')
      .select('collection_id')
      .eq('sound_id', trackId)
    
    if (fetchError) throw fetchError
    
    const currentIds = (current || []).map(c => c.collection_id)
    const toAdd = selectedCollectionIds.value.filter(id => !currentIds.includes(id))
    const toRemove = currentIds.filter(id => !selectedCollectionIds.value.includes(id))
    
    // Remove from deselected collections
    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('collections_sounds')
        .delete()
        .eq('sound_id', trackId)
        .in('collection_id', toRemove)
      
      if (deleteError) throw deleteError
    }
    
    // Add to new collections
    if (toAdd.length > 0) {
      const collectionsToInsert = toAdd.map(collectionId => ({
        collection_id: collectionId,
        sound_id: trackId
      }))
      
      const { error: insertError } = await supabase
        .from('collections_sounds')
        .insert(collectionsToInsert)
      
      if (insertError) throw insertError
    }
  } catch (err) {
    console.error('Error syncing collections:', err)
    // Don't fail the whole update if collection sync fails
  }
}

// Fetch collections on mount
onMounted(async () => {
  await fetchCollections()
})

// Watch for trackToEdit changes to populate form and load collections
watch(() => props.trackToEdit, async (newTrack) => {
  if (newTrack) {
    const moodString = Array.isArray(newTrack.mood) 
      ? newTrack.mood.join(', ') 
      : (newTrack.mood || '')
    
    metadata.value = {
      title: newTrack.title || '',
      artist: newTrack.artist || '',
      version: newTrack.version || 'v1.0',
      track_group_name: newTrack.track_group_name || '',
      collection_name: '', // Not used anymore, kept for backwards compatibility
      genre: newTrack.genre || '',
      mood: moodString,
      bpm: newTrack.bpm || null,
      year: newTrack.year || null
    }
    
    // Load track's current collections
    await loadTrackCollections(newTrack.id)
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
        track_group_name: metadata.value.track_group_name || null,
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
    
    // Sync collections
    await syncCollections(props.trackToEdit.id)
    
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

