# Search and Filter System - Remaining Tasks

## Completed ✅
- Core infrastructure (composables, utilities, components)
- SearchModal component with dual-column layout
- SearchFilter updated (removed Filter/Sort button)
- LibraryHeader updated (added Filter/Sort button)
- Pages updated: software, kits, collection detail
- Layout integration

## Remaining Tasks

### High Priority
1. **Update Profile Page** (`app/pages/u/[id].vue`)
   - Add LibraryHeader with Filter/Sort for music section
   - Pass music tracks as context items for search

2. **Update Group Page** (`app/pages/u/[username]/g/[group].vue`)
   - Add LibraryHeader with Filter/Sort if header doesn't exist
   - Pass group tracks as context items for search

3. **Context Search Integration**
   - Wire up context items from pages to SearchModal via layout
   - Ensure pages provide their items to the layout for context search
   - Fix context search to properly filter items on current page

4. **Search Modal UX Improvements**
   - Position modal below search bar (not centered)
   - Make it feel like a drawer/dropdown extension of the search bar
   - Improve visual integration with search input

### Medium Priority
5. **Database Components Cleanup**
   - Remove old inline search logic from Database.vue
   - Remove old inline search logic from DatabaseGrid.vue
   - Update to rely on SearchModal for search functionality

6. **Old Code Cleanup**
   - Remove unused search handlers from layout
   - Clean up backward compatibility search event emissions
   - Remove old search registration/unregistration code if no longer needed

### Low Priority / Future Enhancements
7. **Search Performance**
   - Add result caching
   - Optimize debounce timing
   - Consider virtual scrolling for large result sets

8. **Accessibility**
   - Add ARIA labels to search modal
   - Improve keyboard navigation
   - Add screen reader announcements

9. **Testing**
   - Test search on all page types
   - Test filter/sort integration
   - Test navigation and scrolling

