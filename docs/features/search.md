# Search Functionality

## Overview
Real-time search implementation that filters resources as the user types, using a word-start matching algorithm for precise results.

## Implementation Details

### Search Component (SearchFilter.vue)
```javascript
const searchQuery = ref('')
const emit = defineEmits(['open-modal', 'open-filter-modal', 'search'])

const onSearch = () => {
  emit('search', searchQuery.value)
}
```

### Search Logic (Database.vue)
```javascript
// Apply search filter first
if (this.searchQuery) {
  const query = this.searchQuery.trim().toLowerCase()
  filteredData = data.filter(resource => {
    const name = resource.name?.toLowerCase() || ''
    const creator = resource.creator?.toLowerCase() || ''
    const tags = resource.tags?.map(tag => tag.toLowerCase()) || []
    const type = resource.type?.toLowerCase() || ''

    // Split name into words and check if any word starts with the query
    const nameWords = name.split(' ')
    const creatorWords = creator.split(' ')

    return nameWords.some(word => word.startsWith(query)) ||
      creatorWords.some(word => word.startsWith(query)) ||
      tags.some(tag => tag.startsWith(query)) ||
      type.startsWith(query)
  })
}
```

## Search Features
- Real-time filtering as user types
- Case-insensitive matching
- Word-start matching (e.g., "ab" matches "Ableton" but not "DAW")
- Searches across multiple fields:
  - Resource name (by word)
  - Creator name (by word)
  - Tags
  - Resource type

## Search Flow
1. User types in search input
2. SearchFilter.vue emits search event with query
3. App.vue passes query to Database.vue
4. Database.vue filters data in real-time
5. UI updates immediately with matching results

## Zero State
- Shows "No resources found" message when search returns no results
- Suggests adjusting filters or search terms
- Maintains consistent table layout
