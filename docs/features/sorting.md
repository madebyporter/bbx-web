# Sorting System

## Overview
Flexible sorting system that allows users to sort resources by multiple fields with customizable direction (ascending/descending).

## Sort Fields

### Date Added (Default)
```javascript
// Default sort by created_at
currentSort: {
  sortBy: 'created_at',
  sortDirection: 'desc'
}
```
- Default sorting field
- Newest items appear first
- Uses PostgreSQL timestamp

### Name
- Alphabetical sorting of resource names
- Case-insensitive comparison
- Handles special characters and numbers

### Creator
- Alphabetical sorting by creator name
- Case-insensitive comparison
- Useful for finding resources by company/developer

### Price
```javascript
// Special handling for price sorting
if (this.currentSort.sortBy === 'price') {
  filteredData.sort((a, b) => {
    const priceA = parseFloat(a.price.replace('$', ''))
    const priceB = parseFloat(b.price.replace('$', ''))
    return this.currentSort.sortDirection === 'asc' 
      ? priceA - priceB 
      : priceB - priceA
  })
}
```
- Numerical sorting of price values
- Strips currency symbol for comparison
- Handles free ($0) items correctly

## Sort Implementation

### Sort Controls
```javascript
// Sort selection in FilterSort.vue
<select 
  v-model="sortBy" 
  class="w-full p-2 border border-gray-300 rounded-md"
>
  <option value="created_at">Date Added</option>
  <option value="name">Name</option>
  <option value="creator">Creator</option>
  <option value="price">Price</option>
</select>
```

### Direction Controls
```javascript
<select 
  v-model="sortDirection" 
  class="w-full p-2 border border-gray-300 rounded-md"
>
  <option value="asc">Ascending</option>
  <option value="desc">Descending</option>
</select>
```

## Sort Application

### General Sorting
```javascript
filteredData.sort((a, b) => {
  const valueA = a[this.currentSort.sortBy]
  const valueB = b[this.currentSort.sortBy]
  const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0
  return this.currentSort.sortDirection === 'asc' 
    ? comparison 
    : -comparison
})
```

### Features
- Maintains filter state while sorting
- Real-time preview of sorted results
- Persists across searches
- Clear option to reset to default sort
- Combines with filtering system
