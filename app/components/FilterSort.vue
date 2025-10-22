<template>
  <MasterDrawer :show="show" @update:show="(val) => emit('update:show', val)" ref="drawerRef">
    <template #header>
      <h2 class="text-2xl">Filter & Sort</h2>
    </template>

    <div class="grow overflow-y-auto flex flex-col gap-8">
      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Column 1: Sort By -->
        <div>
          <label class="block nav-header mb-2">Sort By</label>
          <select v-model="sortBy" class="w-full p-2 border border-neutral-800 rounded-md outline-none">
            <option value="created_at">Date Added</option>
            <!-- Software/Kits options -->
            <option v-if="context !== 'music'" value="name">Name</option>
            <option v-if="context !== 'music'" value="creator">Creator</option>
            <option v-if="context !== 'music'" value="price">Price</option>
            <!-- Music options -->
            <option v-if="context === 'music'" value="title">Title</option>
            <option v-if="context === 'music'" value="artist">Artist</option>
            <option v-if="context === 'music'" value="bpm">BPM</option>
            <option v-if="context === 'music'" value="year">Year</option>
          </select>
        </div>

        <!-- Column 2: Direction -->
        <div>
          <label class="block nav-header mb-2">Direction</label>
          <select v-model="sortDirection" class="w-full p-2 border border-neutral-800 rounded-md outline-none">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      <!-- Filtering Section -->
      <div class="flex flex-col gap-6">
        <!-- Software/Kits Filters -->
        <template v-if="context !== 'music'">
          <!-- Price Filter -->
          <div>
            <label class="block nav-header mb-2">Price</label>
            <div class="flex gap-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="filters.price.free" class="hidden" />
                <div class="px-3 py-2 rounded-md" :class="[
                  filters.price.free ? 'tag-active' : 'tag'
                ]">
                  Free
                </div>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="filters.price.paid" class="hidden" />
                <div class="px-3 py-2 rounded-md" :class="[
                  filters.price.paid ? 'tag-active' : 'tag'
                ]">
                  Paid
                </div>
              </label>
            </div>
          </div>

          <!-- OS Filter -->
          <div>
            <label class="block nav-header mb-2">Operating System</label>
            <div class="flex gap-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" value="mac" v-model="filters.os" class="hidden" />
                <div class="flex items-center gap-2 px-3 py-2 rounded-md" :class="[
                  filters.os.includes('mac') ? 'tag-active' : 'tag'
                ]">
                  <IconApple />
                  <span>macOS</span>
                </div>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" value="windows" v-model="filters.os" class="hidden" />
                <div class="flex items-center gap-2 px-3 py-2 rounded-md" :class="[
                  filters.os.includes('windows') ? 'tag-active' : 'tag'
                ]">
                  <IconWindows />
                  <span>Windows</span>
                </div>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" value="linux" v-model="filters.os" class="hidden" />
                <div class="flex items-center gap-2 px-3 py-2 rounded-md" :class="[
                  filters.os.includes('linux') ? 'tag-active' : 'tag'
                ]">
                  <IconLinux />
                  <span>Linux</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Tags Filter -->
          <div>
            <label class="block nav-header mb-2">Tags</label>
            <div class="flex flex-wrap gap-2 p-4 bg-neutral-900 ring-1 ring-neutral-800 rounded-lg min-h-[56px]">
              <div v-for="tag in selectedTags" :key="tag" class="tag">
                {{ tag }}
                <button @click="removeTag(tag)" class="hover:text-neutral-600 cursor-pointer">
                  ×
                </button>
              </div>

              <input v-model="tagInput" type="text" class="flex-grow bg-transparent outline-none"
                placeholder="Type to search or add tags" @input="searchTags" @keydown.enter.prevent="addTag" />
            </div>
            <!-- Tag suggestions dropdown -->
            <div v-if="showSuggestions && filteredTags.length > 0"
              class="mt-1 bg-neutral-800 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              <div v-for="tag in filteredTags" :key="tag" class="px-4 py-2 hover:bg-neutral-700 cursor-pointer"
                @click="selectTag(tag)">
                {{ tag }}
              </div>
            </div>
          </div>
        </template>

        <!-- Music Filters -->
        <template v-if="context === 'music'">
          <!-- Genre Filter -->
          <div>
            <label class="block nav-header mb-2">Genre</label>
            <select v-model="filters.genre" multiple
              class="w-full p-2 border border-neutral-800 rounded-md min-h-[100px] outline-none">
              <option value="Electronic">Electronic</option>
              <option value="Hip-Hop">Hip-Hop</option>
              <option value="Trap">Trap</option>
              <option value="Ambient">Ambient</option>
              <option value="House">House</option>
              <option value="Techno">Techno</option>
              <option value="Drum & Bass">Drum & Bass</option>
              <option value="Dubstep">Dubstep</option>
              <option value="Pop">Pop</option>
              <option value="Rock">Rock</option>
              <option value="Jazz">Jazz</option>
              <option value="Classical">Classical</option>
            </select>
            <p class="text-xs text-neutral-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>

          <!-- BPM Range Filter -->
          <div>
            <label class="block nav-header mb-2">BPM Range</label>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <input v-model.number="filters.bpm.min" type="number" placeholder="Min (e.g. 120)"
                  class="w-full p-2 border border-neutral-800 rounded-md outline-none" min="0" max="300" />
              </div>
              <div>
                <input v-model.number="filters.bpm.max" type="number" placeholder="Max (e.g. 140)"
                  class="w-full p-2 border border-neutral-800 rounded-md outline-none" min="0" max="300" />
              </div>
            </div>
          </div>

          <!-- Key Filter -->
          <div>
            <label class="block nav-header mb-2">Key</label>
            <select v-model="filters.key" multiple
              class="w-full p-2 border border-neutral-800 rounded-md min-h-[100px] outline-none">
              <option value="C Major">C Major</option>
              <option value="C Minor">C Minor</option>
              <option value="C# Major">C# Major</option>
              <option value="C# Minor">C# Minor</option>
              <option value="D Major">D Major</option>
              <option value="D Minor">D Minor</option>
              <option value="D# Major">D# Major</option>
              <option value="D# Minor">D# Minor</option>
              <option value="E Major">E Major</option>
              <option value="E Minor">E Minor</option>
              <option value="F Major">F Major</option>
              <option value="F Minor">F Minor</option>
              <option value="F# Major">F# Major</option>
              <option value="F# Minor">F# Minor</option>
              <option value="G Major">G Major</option>
              <option value="G Minor">G Minor</option>
              <option value="G# Major">G# Major</option>
              <option value="G# Minor">G# Minor</option>
              <option value="A Major">A Major</option>
              <option value="A Minor">A Minor</option>
              <option value="A# Major">A# Major</option>
              <option value="A# Minor">A# Minor</option>
              <option value="B Major">B Major</option>
              <option value="B Minor">B Minor</option>
            </select>
            <p class="text-xs text-neutral-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>

          <!-- Mood Filter (similar to tags) -->
          <div>
            <label class="block nav-header mb-2">Mood</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="mood in ['Dark', 'Happy', 'Energetic', 'Chill', 'Aggressive', 'Melancholic', 'Uplifting', 'Mysterious']"
                :key="mood" class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" :value="mood" v-model="filters.mood" class="hidden" />
                <div class="px-3 py-2 rounded-md" :class="[
                  filters.mood.includes(mood) ? 'tag-active' : 'tag'
                ]">
                  {{ mood }}
                </div>
              </label>
            </div>
          </div>

          <!-- Year Range Filter -->
          <div>
            <label class="block nav-header mb-2">Year Range</label>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <input v-model.number="filters.year.min" type="number" placeholder="From (e.g. 2020)"
                  class="w-full p-2 border border-neutral-800 rounded-md outline-none" min="1900" max="2099" />
              </div>
              <div>
                <input v-model.number="filters.year.max" type="number" placeholder="To (e.g. 2024)"
                  class="w-full p-2 border border-neutral-800 rounded-md outline-none" min="1900" max="2099" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Apply and Clear Buttons -->
    <div class="flex flex-col items-center gap-4">
      <button @click="applyFiltersAndSort" class="btn w-full apply-filters-btn">
        Apply Filters & Sort
      </button>
      <button @click="clearAll" class="text-neutral-500 hover:text-neutral-700 cursor-pointer">
        Clear All
      </button>
    </div>
  </MasterDrawer>
</template>

<script setup>
import IconApple from './IconApple.vue'
import IconWindows from './IconWindows.vue'
import IconLinux from './IconLinux.vue'
import { useSupabase } from '~/utils/supabase'
import { ref, onMounted, reactive, computed } from 'vue'
import MasterDrawer from './MasterDrawer.vue'

// Reference to the MasterDrawer component
const drawerRef = ref(null)

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  context: {
    type: String,
    default: 'software',
    validator: (value) => ['software', 'kits', 'music'].includes(value)
  },
  initialFilters: {
    type: Object,
    default: () => ({
      price: { free: false, paid: false },
      os: [],
      tags: [],
      // Music filters
      genre: [],
      bpm: { min: null, max: null },
      key: [],
      mood: [],
      year: { min: null, max: null }
    })
  },
  initialSort: {
    type: Object,
    default: () => ({
      sortBy: 'created_at',
      sortDirection: 'desc'
    })
  }
})

const emit = defineEmits(['update:show', 'apply-filters'])

// Filter and sort state
const sortBy = ref(props.initialSort.sortBy)
const sortDirection = ref(props.initialSort.sortDirection)
const filters = reactive({
  // Software/Kits filters
  price: {
    free: props.initialFilters.price?.free || false,
    paid: props.initialFilters.price?.paid || false
  },
  os: [...(props.initialFilters.os || [])],
  tags: [...(props.initialFilters.tags || [])],
  // Music filters
  genre: [...(props.initialFilters.genre || [])],
  bpm: {
    min: props.initialFilters.bpm?.min || null,
    max: props.initialFilters.bpm?.max || null
  },
  key: [...(props.initialFilters.key || [])],
  mood: [...(props.initialFilters.mood || [])],
  year: {
    min: props.initialFilters.year?.min || null,
    max: props.initialFilters.year?.max || null
  }
})

// Tags state
const { supabase } = useSupabase()
const tagInput = ref('')
const availableTags = ref([])
const filteredTags = ref([])
const showSuggestions = ref(false)
const selectedTags = computed(() => filters.tags)

// TODO: Consider extracting tag search functionality into a reusable composable
// that both FilterSort and SubmitResource components can use

// Fetch all available tags from the database
const fetchTags = async () => {
  if (!supabase) return

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('name')
      .order('name')

    if (error) throw error
    
    availableTags.value = data
      .map(tag => tag.name)
      .sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.error('FilterSort: Error fetching tags:', error)
  }
}

// Initialize component
onMounted(async () => {
  await fetchTags()
})

// Filter tags based on input
const searchTags = () => {
  // When the input is empty, close the dropdown
  if (!tagInput.value) {
    showSuggestions.value = false
    return
  }

  const searchTerm = tagInput.value.toLowerCase()
  
  // First, try to match by start of word (higher priority)
  let startMatches = availableTags.value.filter(tag => 
    tag.toLowerCase().startsWith(searchTerm) && 
    !selectedTags.value.includes(tag)
  )
  
  // Then, add any other matches (contains but doesn't start with)
  let containsMatches = availableTags.value.filter(tag => 
    !tag.toLowerCase().startsWith(searchTerm) &&
    tag.toLowerCase().includes(searchTerm) && 
    !selectedTags.value.includes(tag)
  )
  
  // Combine both lists (start matches first)
  filteredTags.value = [...startMatches, ...containsMatches]
  
  // Show suggestions only if we have results
  showSuggestions.value = filteredTags.value.length > 0
}

// Select a tag from the dropdown
const selectTag = (tag) => {
  if (!selectedTags.value.includes(tag)) {
    filters.tags.push(tag)
  }
  tagInput.value = ''
  showSuggestions.value = false
}

// Add a new tag when user presses enter
const addTag = () => {
  if (!tagInput.value.trim()) return
  
  const newTag = tagInput.value.trim().toLowerCase()
  if (!selectedTags.value.includes(newTag)) {
    filters.tags.push(newTag)
  }
  tagInput.value = ''
  showSuggestions.value = false
}

// Remove a tag
const removeTag = (tag) => {
  filters.tags = filters.tags.filter(t => t !== tag)
}

// Apply filters and sort
const applyFiltersAndSort = () => {
  const filterSortParams = {
    sort: {
      sortBy: sortBy.value,
      sortDirection: sortDirection.value
    },
    filters: {
      // Software/Kits filters
      price: { ...filters.price },
      os: [...filters.os],
      tags: [...filters.tags],
      // Music filters
      genre: [...filters.genre],
      bpm: { ...filters.bpm },
      key: [...filters.key],
      mood: [...filters.mood],
      year: { ...filters.year }
    }
  }
  
  console.log('FilterSort: Applying filters and sort:', filterSortParams)
  
  // First emit the filters
  emit('apply-filters', filterSortParams)
  
  // Then trigger the close animation
  // We need a fake event since MasterDrawer's handleClose expects one
  const fakeEvent = { preventDefault: () => {}, stopPropagation: () => {} }
  
  if (drawerRef.value?.$el) {
    // If we have access to the internal animateOut method, use it
    if (typeof drawerRef.value.animateOut === 'function') {
      drawerRef.value.animateOut()
    } else {
      // Otherwise, fallback to emitting update:show
      emit('update:show', false)
    }
  } else {
    // Fallback
    emit('update:show', false)
  }
}

// Clear all filters and reset to defaults
const clearAll = () => {
  sortBy.value = 'created_at'
  sortDirection.value = 'desc'
  // Software/Kits filters
  filters.price.free = false
  filters.price.paid = false
  filters.os = []
  filters.tags = []
  // Music filters
  filters.genre = []
  filters.bpm.min = null
  filters.bpm.max = null
  filters.key = []
  filters.mood = []
  filters.year.min = null
  filters.year.max = null
}
</script>