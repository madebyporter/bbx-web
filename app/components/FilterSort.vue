<template>
  <MasterDrawer :show="show" @update:show="(val) => emit('update:show', val)" ref="drawerRef">
    <template #header>
      <h2 class="text-2xl">Filter & Sort</h2>
    </template>

    <div class="grow overflow-y-auto flex flex-col gap-8 pb-8">
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
            <option v-if="context === 'music'" value="status">Status</option>
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
                <Button variant="ghost" class="!p-0 hover:text-neutral-600" @click="removeTag(tag)">
                  ×
                </Button>
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
          <!-- Latest Versions Only -->
          <div>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="filters.latestVersionOnly"
                class="mt-1 h-4 w-4 rounded border border-neutral-800 bg-transparent accent-amber-400"
              />
              <span class="flex flex-col gap-1">
                <span class="text-sm font-medium">Latest versions only</span>
                <span class="text-xs text-neutral-500">Hides older versions of tracks and plays only the latest</span>
              </span>
            </label>
          </div>

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

          <!-- Status Filter -->
          <div>
            <label class="block nav-header mb-2">Status</label>
            <div class="flex flex-wrap gap-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" :value="null" v-model="filters.status" class="hidden" />
                <div class="px-3 py-2 rounded-md" :class="[
                  filters.status.includes(null) ? 'tag-active' : 'tag'
                ]">
                  No Status
                </div>
              </label>
              <label
                v-for="status in availableStatuses"
                :key="status.id"
                class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" :value="status.id" v-model="filters.status" class="hidden" />
                <div class="px-3 py-2 rounded-md" :class="[
                  filters.status.includes(status.id) ? 'tag-active' : 'tag'
                ]">
                  {{ status.name }}
                </div>
              </label>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- CTA footer: secondary left, main right; row with wrap on mobile; buttons fill width -->
    <div class="flex flex-row flex-wrap justify-between items-center gap-4 p-4 pb-0 border-t border-neutral-800">
      <button
        type="button"
        class="text-link w-full text-neutral-500 hover:text-neutral-700 no-underline md:flex-1 md:min-w-0 text-center md:text-left"
        @click="showClearAllConfirm = true"
      >
        Clear All
      </button>
      <Button variant="secondary" class="btn apply-filters-btn w-full md:flex-1 md:min-w-0 md:ml-0 ml-auto" @click="applyFiltersAndSort">
        Apply Filters & Sort
      </Button>
    </div>

    <!-- Clear All confirmation (verb labels: Keep All / Clear All) -->
    <ConfirmDialog
      v-model:show="showClearAllConfirm"
      title="Clear all filters?"
      message="This will reset all filters and sort options. You can change them again after."
      cancel-text="Keep All"
      confirm-text="Clear All"
      :confirm-danger="true"
      @confirm="performClearAll"
    />
  </MasterDrawer>
</template>

<script setup lang="ts">
import IconApple from './IconApple.vue'
import IconWindows from './IconWindows.vue'
import IconLinux from './IconLinux.vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useAnalytics } from '~/composables/useAnalytics'
import {
  getDefaultFilterSortParams,
  parseFilterSortParams,
  useFilterSortCookie,
  type FilterSortContext,
  type FilterSortParams,
} from '~/composables/useFilterSortPersistence'
import { ref, onMounted, reactive, computed, watch } from 'vue'
import MasterDrawer from './MasterDrawer.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = withDefaults(defineProps<{
  show?: boolean
  context?: FilterSortContext
  initialFilters?: FilterSortParams['filters']
  initialSort?: FilterSortParams['sort']
}>(), {
  show: false,
  context: 'software',
  initialFilters: () => getDefaultFilterSortParams().filters,
  initialSort: () => getDefaultFilterSortParams().sort,
})

const emit = defineEmits<{
  'update:show': [show: boolean]
  'apply-filters': [params: FilterSortParams]
}>()

// Reference to the MasterDrawer component
const drawerRef = ref<InstanceType<typeof MasterDrawer> | null>(null)
const showClearAllConfirm = ref(false)
const musicFilterCookie = useFilterSortCookie('music')
const softwareFilterCookie = useFilterSortCookie('software')
const kitsFilterCookie = useFilterSortCookie('kits')

const activeFilterCookie = computed(() => {
  if (props.context === 'music') return musicFilterCookie
  if (props.context === 'software') return softwareFilterCookie
  return kitsFilterCookie
})

// Filter and sort state
const sortBy = ref(props.initialSort.sortBy)
const sortDirection = ref<'asc' | 'desc'>(props.initialSort.sortDirection)
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
  },
  status: [...(props.initialFilters.status || [])],
  latestVersionOnly: props.initialFilters.latestVersionOnly || false
})

// Tags state
const { supabase } = useSupabase()
const { user } = useAuth()
const tagInput = ref('')
const availableTags = ref<string[]>([])
const filteredTags = ref<string[]>([])
const showSuggestions = ref(false)
const selectedTags = computed(() => filters.tags)

// Status state
const availableStatuses = ref<Array<{ id: number; name: string }>>([])

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

// Fetch all available statuses for the current user
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
      
      availableStatuses.value = newData || []
    } else {
      availableStatuses.value = data
    }
  } catch (error) {
    console.error('FilterSort: Error fetching statuses:', error)
    availableStatuses.value = []
  }
}

// Reset form fields to defaults without persisting
const resetFormToDefaults = () => {
  const defaults = getDefaultFilterSortParams()
  sortBy.value = defaults.sort.sortBy
  sortDirection.value = defaults.sort.sortDirection
  filters.price.free = defaults.filters.price.free
  filters.price.paid = defaults.filters.price.paid
  filters.os = [...defaults.filters.os]
  filters.tags = [...defaults.filters.tags]
  filters.genre = [...defaults.filters.genre]
  filters.bpm.min = defaults.filters.bpm.min
  filters.bpm.max = defaults.filters.bpm.max
  filters.key = [...defaults.filters.key]
  filters.mood = [...defaults.filters.mood]
  filters.year.min = defaults.filters.year.min
  filters.year.max = defaults.filters.year.max
  filters.status = [...defaults.filters.status]
  filters.latestVersionOnly = defaults.filters.latestVersionOnly
}

// Load saved filters from cookie
const loadSavedFilters = () => {
  try {
    const parsed = parseFilterSortParams(activeFilterCookie.value.value, props.context)

    if (!parsed) {
      resetFormToDefaults()
      return
    }

    sortBy.value = parsed.sort.sortBy
    sortDirection.value = parsed.sort.sortDirection

    if (props.context !== 'music') {
      filters.price.free = parsed.filters.price.free
      filters.price.paid = parsed.filters.price.paid
      filters.os = [...parsed.filters.os]
      filters.tags = [...parsed.filters.tags]
    } else {
      filters.genre = [...parsed.filters.genre]
      filters.bpm.min = parsed.filters.bpm.min
      filters.bpm.max = parsed.filters.bpm.max
      filters.key = [...parsed.filters.key]
      filters.mood = [...parsed.filters.mood]
      filters.year.min = parsed.filters.year.min
      filters.year.max = parsed.filters.year.max
      filters.status = [...parsed.filters.status]
      filters.latestVersionOnly = parsed.filters.latestVersionOnly
    }
  } catch (error) {
    console.error('FilterSort: Error loading saved filters:', error)
  }
}

// Save filters to cookie
const saveFilters = () => {
  try {
    activeFilterCookie.value.value = {
      sort: {
        sortBy: sortBy.value,
        sortDirection: sortDirection.value,
      },
      filters: {
        price: { ...filters.price },
        os: [...filters.os],
        tags: [...filters.tags],
        genre: [...filters.genre],
        bpm: { ...filters.bpm },
        key: [...filters.key],
        mood: [...filters.mood],
        year: { ...filters.year },
        status: [...filters.status],
        latestVersionOnly: filters.latestVersionOnly,
      },
    }
  } catch (error) {
    console.error('FilterSort: Error saving filters:', error)
  }
}

// Watch for context changes and reset sortBy if needed
watch(() => props.context, (newContext, oldContext) => {
  if (newContext !== oldContext) {
    // Load saved filters for new context
    loadSavedFilters()
    
    // Define valid sort options for each context
    const validSortOptions = {
      software: ['created_at', 'name', 'creator', 'price'],
      kits: ['created_at', 'name', 'creator', 'price'],
      music: ['created_at', 'title', 'artist', 'bpm', 'year', 'status']
    }
    
    const validOptions = validSortOptions[newContext] || ['created_at']
    
    // If current sortBy is not valid for new context, reset to 'created_at'
    if (!validOptions.includes(sortBy.value)) {
      sortBy.value = 'created_at'
    }
  }
}, { immediate: false })

// Initialize component
onMounted(async () => {
  await fetchTags()
  await fetchStatuses()
  loadSavedFilters()
})

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    loadSavedFilters()
  }
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
const { capture } = useAnalytics()

const applyFiltersAndSort = () => {
  if (props.context === 'software' || props.context === 'kits') {
    const category = props.context
    if (filters.price.free) {
      capture('resource_filter_applied', { filter_type: 'price', filter_value: 'free', category })
    }
    if (filters.price.paid) {
      capture('resource_filter_applied', { filter_type: 'price', filter_value: 'paid', category })
    }
    for (const os of filters.os) {
      capture('resource_filter_applied', { filter_type: 'os', filter_value: os, category })
    }
    for (const tag of filters.tags) {
      capture('resource_filter_applied', { filter_type: 'tag', filter_value: tag, category })
    }
    capture('resource_filter_applied', {
      filter_type: 'sort',
      filter_value: `${sortBy.value}:${sortDirection.value}`,
      category,
    })
  }

  const filterSortParams: FilterSortParams = {
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
      year: { ...filters.year },
      status: [...filters.status],
      latestVersionOnly: filters.latestVersionOnly
    }
  }
  
  
  // Save filters to cookie for persistence
  saveFilters()
  
  // First emit the filters
  emit('apply-filters', filterSortParams)
  
  // Then trigger the close animation
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

// Clear all filters and reset to defaults (called after user confirms)
const performClearAll = () => {
  resetFormToDefaults()
  saveFilters()
}
</script>