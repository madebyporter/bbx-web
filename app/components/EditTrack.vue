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
        <button @click="showSuccessMessage = false"
          class="text-amber-300 hover:text-amber-400 underline cursor-pointer">
          Edit Again
        </button>
        <span class="text-neutral-600">|</span>
        <button @click="handleClose" class="text-amber-300 hover:text-amber-400 underline cursor-pointer">
          Close
        </button>
      </div>
    </div>

    <!-- Edit Form -->
    <template v-else>
      <div class="flex flex-col gap-4 justify-between grow h-full">
        <!-- Track Metadata -->
        <div class="grow h-fit">
          <div class="flex flex-col gap-4">
            <h3 class="font-semibold">Track Information</h3>

            <!-- Title (full width) -->
            <div class="col-span-2">
              <label class="text-sm text-neutral-400">Title <span class="text-red-500">*</span></label>
              <input v-model="metadata.title" type="text" required
                class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-neutral-400">Artist</label>
                <input v-model="metadata.artist" type="text"
                  class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900" />
              </div>
              <div>
                <label class="text-sm text-neutral-400">Version</label>
                <input v-model="metadata.version" type="text" placeholder="e.g. v1.0, v2.5"
                  class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900" />
              </div>
              <div class="col-span-2">
                <label class="text-sm text-neutral-400">Track Group</label>
                <input v-model="metadata.track_group_name" type="text"
                  class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                  placeholder="e.g., art-dealer-dark" />
                <p class="text-xs text-neutral-500 mt-1">
                  Groups related tracks/versions together. Changes affect this track only.
                </p>
              </div>

              <!-- Status -->
              <div class="col-span-2">
                <label class="text-sm text-neutral-400">Status</label>
                <select v-if="!showNewStatusInput" v-model="metadata.status_id"
                  class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 outline-none"
                  @change="(e) => { if ((e.target as HTMLSelectElement).value === 'new') { showNewStatusInput = true; metadata.status_id = null } }">
                  <option :value="null">No Status</option>
                  <option v-for="status in statuses" :key="status.id" :value="status.id">
                    {{ status.name }}
                  </option>
                  <option value="new">+ Create New Status</option>
                </select>
                <div v-else class="flex gap-2">
                  <input v-model="newStatusName" type="text" placeholder="Enter status name"
                    class="flex-1 p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900"
                    @keydown.enter.prevent />
                  <button type="button" @click="showNewStatusInput = false; newStatusName = ''"
                    class="px-3 py-2 border border-neutral-700 hover:bg-neutral-800 rounded text-neutral-400 cursor-pointer">
                    Cancel
                  </button>
                </div>
                <p class="text-xs text-neutral-500 mt-1">
                  {{ showNewStatusInput ? 'New status will be created when you save' : 'Label tracks with their licensing status' }}
                </p>
              </div>

              <div class="col-span-2">
                <label class="text-sm text-neutral-400">Collections (optional)</label>
                <CollectionSelect v-model="selectedCollectionIds" :collections="collections" size="md"
                  @create-collection="queueCollectionCreation" />
              </div>
              <div>
                <label class="text-sm text-neutral-400">Genre</label>
                <input v-model="metadata.genre" type="text"
                  class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900" />
              </div>
              <div>
                <label class="text-sm text-neutral-400">BPM</label>
                <div class="flex gap-2">
                  <input v-model.number="metadata.bpm" type="number"
                    class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900" />
                  <button 
                    type="button"
                    @click="analyzeBPMForTrack"
                    :disabled="isAnalyzingBpm"
                    class="px-3 py-2 border border-neutral-700 hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    title="Analyze BPM">
                    <CircleSpark v-if="!isAnalyzingBpm" width="20" height="20" stroke-width="1.5" />
                    <svg v-else class="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </button>
                </div>
                <p v-if="bpmAnalysisError" class="text-xs text-red-500 mt-1">{{ bpmAnalysisError }}</p>
                <p v-else-if="isAnalyzingBpm" class="text-xs text-amber-400 mt-1">Analyzing BPM...</p>
              </div>
              <div>
                <label class="text-sm text-neutral-400">Key</label>
                <div class="flex gap-2">
                  <input v-model="metadata.key" type="text" placeholder="e.g. C Major, A Minor"
                    class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900" />
                  <button 
                    type="button"
                    @click="analyzeKeyForTrack"
                    :disabled="isAnalyzingKey"
                    class="px-3 py-2 border border-neutral-700 hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    title="Analyze Key">
                    <CircleSpark v-if="!isAnalyzingKey" width="20" height="20" stroke-width="1.5" />
                    <svg v-else class="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </button>
                </div>
                <p v-if="keyAnalysisError" class="text-xs text-red-500 mt-1">{{ keyAnalysisError }}</p>
                <p v-else-if="isAnalyzingKey" class="text-xs text-amber-400 mt-1">Analyzing Key...</p>
              </div>
              <div>
                <label class="text-sm text-neutral-400">Year</label>
                <input v-model.number="metadata.year" type="number"
                  class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900" />
              </div>
              <div>
                <label class="text-sm text-neutral-400">Mood</label>
                <input v-model="metadata.mood" type="text" placeholder="e.g. Dark, Happy"
                  class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900" />
              </div>


              <!-- Copy Metadata Button -->
              <div v-if="metadata.track_group_name" class="col-span-2 border-t border-neutral-800 pt-4">
                <button type="button" @click="copyMetadataFromGroup" :disabled="isCopyingMetadata"
                  class="w-full p-2 border border-neutral-700 hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {{ isCopyingMetadata ? 'Copying...' : 'Copy Metadata from Group Versions' }}
                </button>
                <p class="text-xs text-neutral-500 mt-2">
                  {{ copyMetadataMessage || 'Auto-fills empty fields from the most complete version in this group' }}
                </p>
              </div>
            </div>

            <!-- Delete Button -->
            <div class="pt-4 border-t border-neutral-800">
              <button type="button" @click="handleDelete"
                class="border border-red-500 hover:bg-red-500/10 rounded p-2 text-red-500 hover:text-red-400 text-sm w-full cursor-pointer">
                Delete Track
              </button>
            </div>
          </div>
        </div>

        <!-- Update Button -->
        <div class="sticky bottom-0 flex justify-end bg-neutral-900">
          <button @click="onSubmit" class="btn w-full" :disabled="isUpdating">
            {{ isUpdating ? 'Updating...' : 'Update Track' }}
          </button>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="text-red-500 text-sm mt-4">
          {{ error }}
        </div>
      </div>
    </template>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { analyzeBPM, analyzeKey } from '~/composables/useAudioAnalyzer'
import MasterDrawer from './MasterDrawer.vue'
import CollectionSelect from './CollectionSelect.vue'
import { generateSlug, generateUniqueSlug } from '~/utils/collections'
import { CircleSpark } from '@iconoir/vue'

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
  key: string | null
  year: number | null
  status_id: number | null
}

interface TrackStatus {
  id: number
  name: string
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
const isCopyingMetadata = ref(false)
const copyMetadataMessage = ref<string | null>(null)
const isAnalyzingBpm = ref(false)
const bpmAnalysisError = ref<string | null>(null)
const isAnalyzingKey = ref(false)
const keyAnalysisError = ref<string | null>(null)

const metadata = ref<TrackMetadata>({
  title: '',
  artist: '',
  version: 'v1.0',
  collection_name: '',
  genre: '',
  mood: '',
  bpm: null,
  key: null,
  year: null,
  status_id: null
})

const collections = ref<Collection[]>([])
const selectedCollectionIds = ref<number[]>([])
const pendingCollections = ref<Array<{ tempId: number, name: string }>>([])

const statuses = ref<TrackStatus[]>([])
const showNewStatusInput = ref(false)
const newStatusName = ref('')

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

const fetchStatuses = async () => {
  if (!supabase || !user.value) return
  
  try {
    const { data, error } = await supabase
      .from('track_statuses')
      .select('id, name')
      .eq('user_id', user.value.id)
      .order('name')
    
    if (error) throw error
    
    // If user has no statuses, create defaults for them
    if (!data || data.length === 0) {
      await supabase.rpc('create_default_statuses_for_user', { target_user_id: user.value.id })
      
      // Fetch again after creating defaults
      const { data: newData } = await supabase
        .from('track_statuses')
        .select('id, name')
        .eq('user_id', user.value.id)
        .order('name')
      
      statuses.value = newData || []
    } else {
      statuses.value = data
    }
  } catch (error) {
    console.error('Error fetching statuses:', error)
    statuses.value = []
  }
}

const queueCollectionCreation = (name: string) => {
  if (!name.trim()) return
  
  // Create a temporary collection ID (negative numbers to avoid conflicts)
  const tempId = -Date.now() - Math.random() * 1000
  
  // Create a temporary collection object
  const tempCollection = {
    id: tempId,
    name: name.trim(),
    slug: name.trim().toLowerCase().replace(/\s+/g, '-')
  }
  
  // Add to collections list so it shows up in the UI
  collections.value.push(tempCollection)
  
  // Add to selected collections
  if (!selectedCollectionIds.value.includes(tempId)) {
    selectedCollectionIds.value.push(tempId)
  }
  
  // Store the temp collection info for later replacement during update
  pendingCollections.value.push({ tempId, name: name.trim() })
}

const autoHideOlderVersions = async (
  trackId: number,
  trackGroupName: string,
  collectionIds: number[]
) => {
  if (!supabase || !user.value || !trackGroupName) return
  
  try {
    // Find other tracks in the same group by this user
    const { data: groupTracks } = await supabase
      .from('sounds')
      .select('id, version')
      .eq('user_id', user.value.id)
      .eq('track_group_name', trackGroupName)
      .neq('id', trackId) // Exclude the current track
    
    if (!groupTracks || groupTracks.length === 0) return
    
    // For each collection, hide older versions
    for (const collectionId of collectionIds) {
      // Get all tracks from this group that are in this collection
      const { data: tracksInCollection } = await supabase
        .from('collections_sounds')
        .select('sound_id')
        .eq('collection_id', collectionId)
        .in('sound_id', groupTracks.map(t => t.id))
      
      if (!tracksInCollection || tracksInCollection.length === 0) continue
      
      // Hide all older versions in this collection
      const soundIdsToHide = tracksInCollection.map(t => t.sound_id)
      
      if (soundIdsToHide.length > 0) {
        await supabase
          .from('collections_sounds')
          .update({ hidden: true })
          .eq('collection_id', collectionId)
          .in('sound_id', soundIdsToHide)
        
        console.log(`✓ Auto-hid ${soundIdsToHide.length} older version(s) in collection ${collectionId}`)
      }
    }
  } catch (error) {
    console.error('Error auto-hiding older versions:', error)
    // Don't throw - this is a nice-to-have feature
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
        sound_id: trackId,
        hidden: false // New addition is visible by default
      }))
      
      const { error: insertError } = await supabase
        .from('collections_sounds')
        .insert(collectionsToInsert)
      
      if (insertError) throw insertError
      
      // Auto-hide older versions in the newly added collections
      if (props.trackToEdit?.track_group_name) {
        await autoHideOlderVersions(trackId, props.trackToEdit.track_group_name, toAdd)
      }
    }
  } catch (err) {
    console.error('Error syncing collections:', err)
    // Don't fail the whole update if collection sync fails
  }
}

// Fetch collections and statuses on mount
onMounted(async () => {
  await fetchCollections()
  await fetchStatuses()
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
      key: newTrack.key || null,
      year: newTrack.year || null,
      status_id: newTrack.status_id || null
    }
    
    // Load track's current collections
    await loadTrackCollections(newTrack.id)
  }
}, { immediate: true })

const analyzeBPMForTrack = async () => {
  if (!supabase || !props.trackToEdit || !props.trackToEdit.storage_path) {
    bpmAnalysisError.value = 'Cannot analyze: track data unavailable'
    return
  }
  
  isAnalyzingBpm.value = true
  bpmAnalysisError.value = null
  
  try {
    // Get the audio file from Supabase storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('sounds')
      .download(props.trackToEdit.storage_path)
    
    if (downloadError) throw downloadError
    if (!audioData) throw new Error('Failed to download audio file')
    
    // Analyze BPM
    console.log(`🎵 Analyzing BPM for track: ${metadata.value.title}`)
    const detectedBPM = await analyzeBPM(audioData)
    
    // Update the form field
    metadata.value.bpm = detectedBPM
    console.log(`✓ BPM detected: ${detectedBPM}`)
    
  } catch (err: any) {
    console.error('BPM analysis failed:', err)
    bpmAnalysisError.value = err.message || 'Failed to analyze BPM'
    setTimeout(() => { bpmAnalysisError.value = null }, 5000)
  } finally {
    isAnalyzingBpm.value = false
  }
}

const analyzeKeyForTrack = async () => {
  if (!supabase || !props.trackToEdit || !props.trackToEdit.storage_path) {
    keyAnalysisError.value = 'Cannot analyze: track data unavailable'
    return
  }
  
  isAnalyzingKey.value = true
  keyAnalysisError.value = null
  
  try {
    // Get the audio file from Supabase storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('sounds')
      .download(props.trackToEdit.storage_path)
    
    if (downloadError) throw downloadError
    if (!audioData) throw new Error('Failed to download audio file')
    
    // Analyze Key
    console.log(`🎹 Analyzing Key for track: ${metadata.value.title}`)
    const detectedKey = await analyzeKey(audioData)
    
    // Update the form field
    metadata.value.key = detectedKey
    console.log(`✓ Key detected: ${detectedKey}`)
    
  } catch (err: any) {
    console.error('Key analysis failed:', err)
    keyAnalysisError.value = err.message || 'Failed to analyze key'
    setTimeout(() => { keyAnalysisError.value = null }, 5000)
  } finally {
    isAnalyzingKey.value = false
  }
}

const copyMetadataFromGroup = async () => {
  if (!supabase || !props.trackToEdit || !metadata.value.track_group_name) return
  
  isCopyingMetadata.value = true
  copyMetadataMessage.value = 'Searching for versions with complete metadata...'
  
  try {
    // Fetch all tracks in the same group
    const { data: groupTracks, error: groupError } = await supabase
      .from('sounds')
      .select('*')
      .eq('user_id', props.trackToEdit.user_id)
      .eq('track_group_name', metadata.value.track_group_name)
      .neq('id', props.trackToEdit.id) // Exclude current track
      .order('created_at', { ascending: false }) // Latest first
    
    if (groupError) throw groupError
    
    if (!groupTracks || groupTracks.length === 0) {
      copyMetadataMessage.value = '⚠️ No other versions found in this group'
      setTimeout(() => { copyMetadataMessage.value = null }, 3000)
      return
    }
    
    // Find track with most complete metadata
    let bestTrack: any = null
    let bestScore = 0
    
    for (const track of groupTracks) {
      let score = 0
      if (track.artist) score++
      if (track.genre) score++
      if (track.mood && track.mood.length > 0) score++
      if (track.bpm) score++
      if (track.year) score++
      
      if (score > bestScore) {
        bestScore = score
        bestTrack = track
      }
    }
    
    if (!bestTrack || bestScore === 0) {
      copyMetadataMessage.value = '⚠️ No versions with complete metadata found'
      setTimeout(() => { copyMetadataMessage.value = null }, 3000)
      return
    }
    
    // Copy metadata from best track (only fill empty fields)
    let copiedFields: string[] = []
    
    if (!metadata.value.artist && bestTrack.artist) {
      metadata.value.artist = bestTrack.artist
      copiedFields.push('artist')
    }
    if (!metadata.value.genre && bestTrack.genre) {
      metadata.value.genre = bestTrack.genre
      copiedFields.push('genre')
    }
    if (!metadata.value.mood && bestTrack.mood) {
      const moodString = Array.isArray(bestTrack.mood) 
        ? bestTrack.mood.join(', ') 
        : bestTrack.mood
      metadata.value.mood = moodString
      copiedFields.push('mood')
    }
    if (!metadata.value.bpm && bestTrack.bpm) {
      metadata.value.bpm = bestTrack.bpm
      copiedFields.push('BPM')
    }
    if (!metadata.value.key && bestTrack.key) {
      metadata.value.key = bestTrack.key
      copiedFields.push('key')
    }
    if (!metadata.value.year && bestTrack.year) {
      metadata.value.year = bestTrack.year
      copiedFields.push('year')
    }
    
    // Copy collections if current track has none
    if (selectedCollectionIds.value.length === 0) {
      const { data: junctionData } = await supabase
        .from('collections_sounds')
        .select('collection_id')
        .eq('sound_id', bestTrack.id)
      
      if (junctionData && junctionData.length > 0) {
        selectedCollectionIds.value = junctionData.map((item: any) => item.collection_id)
        copiedFields.push('collections')
      }
    }
    
    if (copiedFields.length === 0) {
      copyMetadataMessage.value = '✓ All fields already filled - nothing to copy'
    } else {
      copyMetadataMessage.value = `✓ Copied ${copiedFields.join(', ')} from "${bestTrack.title}" (v${bestTrack.version})`
      console.log(`📋 Copied metadata from "${bestTrack.title}":`, copiedFields)
    }
    
    setTimeout(() => { copyMetadataMessage.value = null }, 5000)
    
  } catch (err: any) {
    console.error('Error copying metadata:', err)
    copyMetadataMessage.value = '❌ Error copying metadata'
    setTimeout(() => { copyMetadataMessage.value = null }, 3000)
  } finally {
    isCopyingMetadata.value = false
  }
}

const createNewStatus = async (): Promise<number | null> => {
  if (!supabase || !user.value || !newStatusName.value.trim()) return null
  
  try {
    const { data, error: createError } = await supabase
      .from('track_statuses')
      .insert({
        user_id: user.value.id,
        name: newStatusName.value.trim()
      })
      .select()
      .single()
    
    if (createError) throw createError
    
    // Add to local statuses list
    statuses.value.push({
      id: data.id,
      name: data.name
    })
    
    return data.id
  } catch (err: any) {
    console.error('Error creating status:', err)
    throw err
  }
}

const onSubmit = async () => {
  if (!supabase || !user.value || !props.trackToEdit) {
    console.error('EditTrack: Missing requirements', { supabase: !!supabase, user: !!user.value, track: !!props.trackToEdit })
    return
  }
  
  isUpdating.value = true
  error.value = null
  
  try {
    // Create new status if needed
    if (showNewStatusInput.value && newStatusName.value.trim()) {
      const newStatusId = await createNewStatus()
      if (newStatusId) {
        metadata.value.status_id = newStatusId
      }
      showNewStatusInput.value = false
      newStatusName.value = ''
    }
    
    // Create pending collections first
    if (pendingCollections.value.length > 0) {
      for (const { tempId, name } of pendingCollections.value) {
        // Get existing slugs to ensure uniqueness
        const { data: existing } = await supabase
          .from('collections')
          .select('slug')
          .eq('user_id', user.value.id)
        
        const existingSlugs = (existing || []).map(c => c.slug)
        const slug = generateUniqueSlug(name, existingSlugs)
        
        // Create the collection
        const { data, error: createError } = await supabase
          .from('collections')
          .insert({
            user_id: user.value.id,
            name: name,
            description: null,
            slug
          })
          .select()
          .single()
        
        if (createError) throw createError
        
        // Replace the temporary collection with the real one
        const tempCollectionIndex = collections.value.findIndex(c => c.id === tempId)
        if (tempCollectionIndex !== -1) {
          collections.value[tempCollectionIndex] = {
            id: data.id,
            name: data.name,
            slug: data.slug
          }
        }
        
        // Replace the temporary ID in selected collections
        const selectedIndex = selectedCollectionIds.value.indexOf(tempId)
        if (selectedIndex !== -1) {
          selectedCollectionIds.value[selectedIndex] = data.id
        }
      }
      
      // Clear pending collections
      pendingCollections.value = []
    }
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
        key: metadata.value.key,
        year: metadata.value.year,
        status_id: metadata.value.status_id
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
    
    // Fetch the updated track with collections to pass back
    const updatedTrackData = data && data.length > 0 ? data[0] : null
    if (updatedTrackData) {
      // Get collection names and slugs for the updated track
      const { data: junctionData } = await supabase
        .from('collections_sounds')
        .select('collection_id')
        .eq('sound_id', updatedTrackData.id)
      
      const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
      
      if (collectionIds.length > 0) {
        const { data: collectionData } = await supabase
          .from('collections')
          .select('name, slug')
          .in('id', collectionIds)
        
        updatedTrackData.collections = collectionData || []
      } else {
        updatedTrackData.collections = []
      }
    }
    
    showSuccessMessage.value = true
    emit('track-updated', updatedTrackData)
    
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
    
    emit('track-updated', null) // Pass null to indicate deletion (trigger refetch)
    handleClose() // Close modal with animation
    
  } catch (err: any) {
    console.error('Delete error:', err)
    error.value = 'Failed to delete track: ' + err.message
  }
}
</script>


