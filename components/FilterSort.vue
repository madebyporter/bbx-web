<template>
  <MasterDrawer :show="show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Filter & Sort</h2>
    </template>

    <div class="grid lg:grid-cols-2 gap-4">
      <!-- Column 1: Sort By -->
      <div>
        <label class="block nav-header mb-2">Sort By</label>
        <select 
          v-model="sortBy" 
          class="w-full p-2 border border-neutral-800 rounded-md"
        >
          <option value="created_at">Date Added</option>
          <option value="name">Name</option>
          <option value="creator">Creator</option>
          <option value="price">Price</option>
        </select>
      </div>

      <!-- Column 2: Direction -->
      <div>
        <label class="block nav-header mb-2">Direction</label>
        <select 
          v-model="sortDirection" 
          class="w-full p-2 border border-neutral-800 rounded-md"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
    </div>

    <!-- Filtering Section -->
    <div class="flex flex-col gap-6">
      <!-- Price Filter -->
      <div>
        <label class="block nav-header mb-2">Price</label>
        <div class="flex gap-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="filters.price.free" 
              class="hidden"
            />
            <div class="px-3 py-2 rounded-md" :class="[
              filters.price.free ? 'tag-active' : 'tag'
            ]">
              Free
            </div>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="filters.price.paid" 
              class="hidden"
            />
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
            <input 
              type="checkbox" 
              value="mac" 
              v-model="filters.os"
              class="hidden"
            />
            <div class="flex items-center gap-2 px-3 py-2 rounded-md" :class="[
              filters.os.includes('mac') ? 'tag-active' : 'tag'
            ]">
              <IconApple />
              <span>macOS</span>
            </div>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              value="windows" 
              v-model="filters.os"
              class="hidden"
            />
            <div class="flex items-center gap-2 px-3 py-2 rounded-md" :class="[
              filters.os.includes('windows') ? 'tag-active' : 'tag'
            ]">
              <IconWindows />
              <span>Windows</span>
            </div>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              value="linux" 
              v-model="filters.os"
              class="hidden"
            />
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
          <div 
            v-for="tag in selectedTags" 
            :key="tag" 
            class="tag"
          >
            {{ tag }}
            <button 
              @click="removeTag(tag)" 
              class="hover:text-neutral-600 cursor-pointer"
            >
              ×
            </button>
          </div>
          
          <input 
            v-model="tagInput"
            type="text"
            class="flex-grow bg-transparent outline-none"
            placeholder="Type to search or add tags"
            @input="searchTags"
            @keydown.enter.prevent="addTag"
          />
        </div>
        <!-- Tag suggestions dropdown -->
        <div 
          v-if="showSuggestions && filteredTags.length > 0"
          class="mt-1 bg-neutral-800 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          <div 
            v-for="tag in filteredTags" 
            :key="tag"
            class="px-4 py-2 hover:bg-neutral-700 cursor-pointer"
            @click="selectTag(tag)"
          >
            {{ tag }}
          </div>
        </div>
      </div>
    </div>

    <!-- Apply and Clear Buttons -->
    <div class="flex flex-col items-center gap-4">
      <button 
        @click="applyFiltersAndSort"
        class="btn w-full apply-filters-btn"
      >
        Apply Filters & Sort
      </button>
      <button 
        @click="clearAll"
        class="text-neutral-500 hover:text-neutral-700 cursor-pointer"
      >
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

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  initialFilters: {
    type: Object,
    default: () => ({
      price: { free: false, paid: false },
      os: [],
      tags: []
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
  price: {
    free: props.initialFilters.price?.free || false,
    paid: props.initialFilters.price?.paid || false
  },
  os: [...(props.initialFilters.os || [])],
  tags: [...(props.initialFilters.tags || [])]
})

// Tags state
const { supabase } = useSupabase()
const tagInput = ref('')
const availableTags = ref([])
const filteredTags = ref([])
const showSuggestions = ref(false)
const selectedTags = computed(() => filters.tags)

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
  if (!tagInput.value) {
    showSuggestions.value = false
    return
  }

  const searchTerm = tagInput.value.toLowerCase()
  filteredTags.value = availableTags.value
    .filter(tag => 
      tag.toLowerCase().includes(searchTerm) && 
      !selectedTags.value.includes(tag)
    )
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
      price: { ...filters.price },
      os: [...filters.os],
      tags: [...filters.tags]
    }
  }
  
  console.log('FilterSort: Applying filters and sort:', filterSortParams)
  emit('apply-filters', filterSortParams)
  emit('update:show', false)
}

// Clear all filters and reset to defaults
const clearAll = () => {
  sortBy.value = 'created_at'
  sortDirection.value = 'desc'
  filters.price.free = false
  filters.price.paid = false
  filters.os = []
  filters.tags = []
}
</script>