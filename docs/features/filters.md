# Filtering System

## Overview
Advanced filtering system that allows users to filter resources by multiple criteria simultaneously: price type, operating systems, and tags.

## Filter Types

### Price Filter
```javascript
// Price filter implementation
if (this.currentFilters.price.free || this.currentFilters.price.paid) {
  const price = parseFloat(resource.price.replace('$', ''))
  const isFree = price === 0
  if (this.currentFilters.price.free && !isFree) return false
  if (this.currentFilters.price.paid && isFree) return false
}
```
- Toggle between Free and Paid resources
- Free is defined as $0
- Paid is any price above $0
- Can select both or neither

### Operating System Filter
```javascript
// OS filter implementation
if (this.currentFilters.os.length > 0) {
  const hasMatchingOS = this.currentFilters.os.some(os => 
    resource.os.includes(os)
  )
  if (!hasMatchingOS) return false
}
```
- Filter by macOS, Windows, and Linux
- Multiple selection supported
- Uses icon-based interface
- Shows only resources compatible with selected OS(s)

### Tags Filter
```javascript
// Tags filter implementation
if (this.currentFilters.tags.length > 0) {
  const hasAllTags = this.currentFilters.tags.every(tag =>
    resource.tags.includes(tag)
  )
  if (!hasAllTags) return false
}
```
- Dynamic tag selection with autocomplete
- Shows existing tags from database
- Multiple tag selection
- Resources must match ALL selected tags

## Filter UI (FilterSort.vue)

### Price Selection
- Checkbox-style toggles
- Visual feedback for selected state
- Clear indication of current selection

### OS Selection
- Icon-based selection
- Visual feedback for selected state
- Multiple selection supported

### Tag Selection
```javascript
// Tag selection with autocomplete
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
}
```
- Autocomplete dropdown
- Tag removal with × button
- Prevents duplicate selections
- Shows all available tags from database

## Filter Application
- Filters can be combined
- Real-time preview of results
- Clear All option to reset filters
- Maintains sort order while filtering
