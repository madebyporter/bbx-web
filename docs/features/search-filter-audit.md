# Search and Filter Audit

**Date**: Current  
**Purpose**: Comprehensive audit of all pages and their search/filter capabilities to identify patterns and inconsistencies for future unification.

## Executive Summary

This audit documents the current state of search and filter functionality across all pages in the application. The audit reveals significant inconsistencies in implementation approaches, with mixed use of server-side and client-side filtering, varying search field scopes, and inconsistent patterns for search handler registration.

## Pages Inventory

### 1. Home/Index Page (`/`)
- **Route**: `app/pages/index.vue`
- **Search**: None
- **Filter**: None
- **Notes**: Redirect page only

---

### 2. Software Page (`/software`)
- **Route**: `app/pages/software.vue`
- **Component**: `Database.vue`
- **Search**: 
  - Text search via SearchFilter component
  - Searches: name, creator, tags, type (contains match)
  - Implementation: Server-side via Supabase `ilike` query
- **Filter & Sort**:
  - Sort: created_at, name, creator, price
  - Price: Free/Paid checkboxes
  - OS: macOS, Windows, Linux (multi-select)
  - Tags: Searchable autocomplete, multi-select
- **Storage**: `filterSort_software` (localStorage)
- **Filter Location**: Server-side (database queries)

---

### 3. Kits Page (`/kits`)
- **Route**: `app/pages/kits.vue`
- **Component**: `DatabaseGrid.vue` (grid layout)
- **Search**: 
  - Text search via SearchFilter component
  - Searches: name only (contains match)
  - Implementation: Server-side via Supabase `ilike` query
- **Filter & Sort**:
  - Same as Software page
- **Storage**: `filterSort_kits` (localStorage)
- **Filter Location**: Server-side (database queries)

---

### 4. User Profile Page (`/u/[id]` or `/u/[username]`)
- **Route**: `app/pages/u/[id].vue`
- **Sections**: Software, Music, Members (audio_pro only)
- **Search**: 
  - Text search via SearchFilter component
  - Searches tracks: title, artist (contains match)
  - Implementation: Client-side filtering after fetch
- **Filter & Sort** (Music section only):
  - Sort: created_at, title, artist, bpm, year, status
  - Genre: Multi-select dropdown (12 options)
  - BPM: Min/Max range (0-300)
  - Key: Multi-select dropdown (24 options - all major/minor keys)
  - Mood: Multi-select checkboxes (8 options)
  - Year: Min/Max range (1900-2099)
  - Status: Multi-select checkboxes (user-specific + "No Status")
- **Software Section Filter**:
  - Tag-based chip/pill filtering (OR logic)
  - No sort options
- **Storage**: `filterSort_music` (localStorage)
- **Filter Location**: Server-side (database queries for filters, client-side for search)

---

### 5. Collections List Page (`/u/[username]/collections`)
- **Route**: `app/pages/u/[username]/collections.vue`
- **Search**: 
  - Text search via SearchFilter component
  - Searches: collection name, description (contains match)
  - Implementation: Client-side filtering
- **Filter & Sort**: None
- **Display**: Table (Name, Description, Track count)

---

### 6. Collection Detail Page (`/u/[username]/c/[collection]`)
- **Route**: `app/pages/u/[username]/c/[collection].vue`
- **Component**: `CollectionTracksTable.vue`
- **Search**: 
  - Text search via SearchFilter component
  - Searches tracks: title, artist (contains match)
  - Implementation: Client-side filtering
- **Filter & Sort**:
  - Same music filters as Profile page
  - Implementation: **Client-side filtering** (filters after fetching all tracks)
- **View Mode**:
  - "Final": Shows only non-hidden tracks
  - "All": Shows all tracks including hidden
- **Storage**: `filterSort_music` (localStorage)
- **Filter Location**: Client-side (JavaScript filtering)

---

### 7. Track Group Page (`/u/[username]/g/[group]`)
- **Route**: `app/pages/u/[username]/g/[group].vue`
- **Component**: `TracksTable.vue`
- **Search**: **MISSING** (no search handler registered)
- **Filter & Sort**:
  - Same music filters as Profile/Collection pages
  - Implementation: Server-side (database queries)
- **Storage**: `filterSort_music` (localStorage)
- **Filter Location**: Server-side (database queries)
- **Notes**: Has stem player functionality

---

### 8. Track Detail Page (`/u/[username]/t/[track]`)
- **Route**: `app/pages/u/[username]/t/[track].vue`
- **Search**: None (not applicable)
- **Filter & Sort**: None (not applicable)
- **Display**: Single track detail view

---

## Component Analysis

### SearchFilter Component
- **Location**: `app/components/SearchFilter.vue`
- **Purpose**: Global search input with CMD+K shortcut
- **Features**: 
  - Clears on route change
  - Shows "Filter & Sort" button
  - Context-aware "Upload/Submit" button
  - Emits 'search' event

### FilterSort Component
- **Location**: `app/components/FilterSort.vue`
- **Purpose**: Modal/drawer for filters and sorting
- **Context-Aware**: Adapts UI based on 'software', 'kits', or 'music' context
- **Persistence**: Saves to localStorage with context-specific keys
- **Emits**: 'apply-filters' event with full params

### Database Component
- **Location**: `app/components/Database.vue`
- **Purpose**: Table view for software resources
- **Search**: Name only (server-side)
- **Filters**: Price, OS, Tags (server-side)
- **Sort**: created_at, name, creator, price (server-side)

### DatabaseGrid Component
- **Location**: `app/components/DatabaseGrid.vue`
- **Purpose**: Grid view for kits/sounds resources
- **Search**: Name only (server-side)
- **Filters**: Same as Database component (server-side)
- **Sort**: Same as Database component (server-side)

### TracksTable Component
- **Location**: `app/components/TracksTable.vue`
- **Purpose**: Displays tracks in table format
- **Search**: None (handled by parent)
- **Filter**: None (handled by parent)
- **Features**: Play controls, bulk selection, shortlist, collections

### CollectionTracksTable Component
- **Location**: `app/components/CollectionTracksTable.vue`
- **Purpose**: Displays collection tracks with hidden/visible toggle
- **Search**: None (handled by parent)
- **Filter**: None (handled by parent)
- **Features**: Play controls, bulk selection, hidden/visible toggle

---

## Key Patterns Identified

### 1. Search Implementation Patterns

**Server-Side Search:**
- Database.vue: Name only (`ilike` query)
- DatabaseGrid.vue: Name only (`ilike` query)

**Client-Side Search:**
- Profile page: Title + Artist (`.includes()`)
- Collections page: Name + Description (`.includes()`)
- Collection detail page: Title + Artist (`.includes()`)

**Missing Search:**
- Track Group page: No search handler registered

### 2. Filter Implementation Patterns

**Server-Side Filtering:**
- Software page: Database queries
- Kits page: Database queries
- Profile Music section: Database queries
- Track Group page: Database queries

**Client-Side Filtering:**
- Collection detail page: JavaScript filtering after fetch
- Profile Software section: Client-side tag filtering (chips)

**Hybrid Approaches:**
- Profile page: Server-side filters + client-side search

### 3. Storage Patterns

- **Keys**: `filterSort_software`, `filterSort_kits`, `filterSort_music`
- **Persistence**: FilterSort component saves on apply
- **Loading**: Pages load saved filters on mount
- **Context-Specific**: Each context has separate storage

### 4. Search Handler Registration

**Pattern:**
1. Layout provides `registerSearchHandler` and `unregisterSearchHandler`
2. Pages inject these functions
3. Pages register handlers in `onMounted`
4. Pages unregister in `onUnmounted`
5. SearchFilter emits → Layout routes → Registered handler

**Issues:**
- Track Group page doesn't register handler (missing search)
- Inconsistent fallback logic in layout

### 5. Filter Context System

**Contexts:**
- `'software'`: Software page
- `'kits'`: Kits page
- `'music'`: Profile, Collections, Track Group pages

**Determination:**
- Layout computes context from route path
- FilterSort adapts UI based on context prop
- Storage keys match context names

---

## Critical Issues and Inconsistencies

1. **Search Field Mismatch**
   - Software/Kits: Search name only
   - Music pages: Search title + artist
   - Collections: Search name + description
   - No unified search scope

2. **Filter Location Inconsistency**
   - Some pages filter server-side (efficient for large datasets)
   - Collection detail page filters client-side (inefficient, loads all data)
   - No clear pattern for when to use which approach

3. **Missing Search Functionality**
   - Track Group page has no search despite displaying tracks
   - Should have search capability like other track list pages

4. **Search Implementation Variance**
   - Database components use Supabase `ilike` (server-side)
   - Other pages use JavaScript `.includes()` (client-side)
   - Different performance characteristics and capabilities

5. **No Unified Search API**
   - Each component implements search differently
   - No reusable search composable or utility
   - Search logic duplicated across components

6. **Filter Persistence Issues**
   - Storage keys are hardcoded strings
   - No validation or migration strategy
   - Context determination could be error-prone

7. **Context Determination Logic**
   - Manual string matching in layout
   - Could break with route changes
   - Not type-safe

---

## Recommendations for Future Implementation

1. **Create Unified Search Composable**
   - Standardize search field scopes per context
   - Support both server-side and client-side strategies
   - Provide consistent search API across pages

2. **Standardize Filter Application**
   - Define clear rules for server-side vs client-side filtering
   - Collection detail page should use server-side filtering
   - Create reusable filter application utilities

3. **Implement Missing Search**
   - Add search handler to Track Group page
   - Ensure all track list pages have consistent search

4. **Create Filter State Management**
   - Type-safe filter context system
   - Improved persistence with validation
   - Better context determination (route-based or page-based)

5. **Unify Search Input Component**
   - Single search component with context awareness
   - Consistent keyboard shortcuts
   - Better integration with filter system

6. **Improve Filter Persistence**
   - Type-safe storage keys
   - Migration support for filter schema changes
   - Better error handling

---

## Data Flow Diagrams

### Current Search Flow
```
SearchFilter Component
  ↓ (emit 'search' event)
Layout (default.vue)
  ↓ (route to registered handler)
Page Component
  ↓ (forward to)
Data Component (Database/DatabaseGrid/TracksTable)
  ↓ (apply search)
Filter Results (server-side or client-side)
```

### Current Filter Flow
```
FilterSort Component
  ↓ (emit 'apply-filters' event)
Layout (default.vue)
  ↓ (determine context & route)
Page Component / Data Component
  ↓ (apply filters)
Query Database OR Filter Client-Side
  ↓
Display Results
```

---

## Next Steps

1. Design unified search/filter API specification
2. Create composable for search/filter state management
3. Standardize server-side vs client-side filtering decisions
4. Implement missing search on Track Group page
5. Create unified search input component
6. Improve filter persistence with type safety
7. Refactor existing pages to use unified system
