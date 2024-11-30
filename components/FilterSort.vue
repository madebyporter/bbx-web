<template>
  <Teleport to="body">
    <aside 
      v-show="show" 
      ref="modal"
      class="fixed right-4 top-4 bottom-4 w-2/5 bg-white rounded-md p-8 overflow-auto z-50"
      style="transform: translateX(100%)"
    >
      <div 
        @click="close" 
        class="flex justify-center items-center bg-neutral-800 hover:bg-neutral-900 p-4 w-fit rounded-md cursor-pointer fixed top-8 right-9"
      >
        <img src="/img/db/icon-close.svg" alt="Close" class="size-4 fill-white" />
      </div>

      <div @click.stop>
        <h2 class="text-2xl font-bold mb-8">Filter & Sort</h2>
        
        <div class="grid grid-cols-2 gap-4 mb-8">
          <!-- Column 1: Sort By -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select 
              v-model="sortBy" 
              class="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="created_at">Date Added</option>
              <option value="name">Name</option>
              <option value="creator">Creator</option>
              <option value="price">Price</option>
            </select>
          </div>

          <!-- Column 2: Direction -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Direction</label>
            <select 
              v-model="sortDirection" 
              class="w-full p-2 border border-gray-300 rounded-md"
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
            <label class="block text-sm font-medium text-gray-700 mb-2">Price</label>
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
            <label class="block text-sm font-medium text-gray-700 mb-2">Operating System</label>
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
            <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div class="flex flex-wrap gap-2 p-4 bg-neutral-100 rounded-lg min-h-[56px]">
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
              class="mt-1 bg-white rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
            >
              <div 
                v-for="tag in filteredTags" 
                :key="tag"
                class="px-4 py-2 hover:bg-neutral-100 cursor-pointer"
                @click="selectTag(tag)"
              >
                {{ tag }}
              </div>
            </div>
          </div>
        </div>

        <!-- Apply and Clear Buttons -->
        <div class="flex flex-col items-center gap-4 mt-8">
          <button 
            @click="applyFiltersAndSort"
            class="btn w-full"
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
      </div>
    </aside>
  </Teleport>
</template>

<script>
import gsap from 'gsap'
import IconApple from './IconApple.vue'
import IconWindows from './IconWindows.vue'
import IconLinux from './IconLinux.vue'
import { useSupabase } from '../utils/supabase'

export default {
  components: {
    IconApple,
    IconWindows,
    IconLinux
  },
  setup() {
    const { supabase } = useSupabase()
    return {
      supabase
    }
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      sortBy: 'created_at',
      sortDirection: 'desc',
      filters: {
        price: {
          free: false,
          paid: false
        },
        os: [],
        tags: []
      },
      tagInput: '',
      selectedTags: [],
      availableTags: [],
      showSuggestions: false,
      filteredTags: []
    }
  },
  watch: {
    show(newValue) {
      if (newValue) {
        this.animateIn()
      }
    }
  },
  methods: {
    animateIn() {
      gsap.to(this.$refs.modal, {
        duration: 0.3,
        x: 0,
        ease: 'power2.out'
      })
    },
    animateOut() {
      gsap.to(this.$refs.modal, {
        duration: 0.3,
        x: '100%',
        ease: 'power2.in',
        onComplete: () => {
          this.$emit('close')
        }
      })
    },
    close() {
      this.animateOut()
    },
    async fetchTags() {
      try {
        const { data, error } = await this.supabase
          .from('resources')
          .select('tags')

        if (error) throw error
        this.availableTags = [...new Set(data.flatMap(resource => resource.tags))]
          .sort((a, b) => a.localeCompare(b))
      } catch (error) {
        console.error('Error fetching tags:', error)
      }
    },
    searchTags() {
      if (!this.tagInput) {
        this.showSuggestions = false
        return
      }
      const searchTerm = this.tagInput.toLowerCase()
      this.filteredTags = this.availableTags
        .filter(tag => 
          tag.toLowerCase().includes(searchTerm) && 
          !this.selectedTags.includes(tag)
        )
      this.showSuggestions = true
    },
    selectTag(tag) {
      if (!this.selectedTags.includes(tag)) {
        this.selectedTags.push(tag)
      }
      this.tagInput = ''
      this.showSuggestions = false
    },
    addTag() {
      if (!this.tagInput.trim()) return
      
      const newTag = this.tagInput.trim().toUpperCase()
      if (!this.selectedTags.includes(newTag)) {
        this.selectedTags.push(newTag)
      }
      this.tagInput = ''
      this.showSuggestions = false
    },
    removeTag(tag) {
      this.selectedTags = this.selectedTags.filter(t => t !== tag)
    },
    applyFiltersAndSort() {
      this.$emit('apply-filters-and-sort', {
        sort: {
          sortBy: this.sortBy,
          sortDirection: this.sortDirection
        },
        filters: {
          price: this.filters.price,
          os: this.filters.os,
          tags: this.selectedTags
        }
      })
      this.close()
    },
    clearAll() {
      // Reset all filters and sort to default values
      this.sortBy = 'created_at'
      this.sortDirection = 'desc'
      this.filters.price.free = false
      this.filters.price.paid = false
      this.filters.os = []
      this.selectedTags = []
      
      // Apply the cleared state
      this.applyFiltersAndSort()
    }
  },
  mounted() {
    this.fetchTags()
  }
}
</script>

<style scoped>
/* Add your modal styles here, similar to SubmitResource.vue */
</style>

