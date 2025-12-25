/**
 * Unified search composable for site-wide and context searches
 */

import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { searchAll, searchSoftware, searchTracks, searchCollections, searchUsers, searchItems } from '~/utils/search'
import { getSearchContext, hasContextSearch } from '~/utils/searchContext'
import type { SearchResult } from '~/utils/searchNavigation'

export function useSearch() {
  const route = useRoute()
  const searchQuery = ref('')
  const siteResults = ref<SearchResult[]>([])
  const contextResults = ref<SearchResult[]>([])
  const isSearching = ref(false)
  const debounceTimer = ref<NodeJS.Timeout | null>(null)

  const context = computed(() => getSearchContext(route))
  const hasContext = computed(() => hasContextSearch(route))

  /**
   * Debounce helper
   */
  function debounce(func: () => void, delay: number) {
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
    }
    debounceTimer.value = setTimeout(func, delay)
  }

  /**
   * Perform site-wide search
   */
  async function searchSitewide(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      siteResults.value = []
      return []
    }

    isSearching.value = true
    try {
      const results = await searchAll(query, 5) // Limit to 5 per type
      siteResults.value = results
      return results
    } catch (error) {
      console.error('Error in site-wide search:', error)
      siteResults.value = []
      return []
    } finally {
      isSearching.value = false
    }
  }

  /**
   * Perform context search (search within current page's items)
   * This is client-side search on already-loaded items
   */
  async function searchContext(
    query: string,
    contextItems: any[],
    searchFields: string[]
  ): Promise<SearchResult[]> {
    if (!query.trim() || !contextItems || !contextItems.length) {
      contextResults.value = []
      return []
    }

    isSearching.value = true
    try {
      // Use client-side search utility
      const filtered = searchItems(contextItems, query, searchFields as any[], 8)

      // Convert to SearchResult format based on context type
      const results = convertItemsToSearchResults(filtered, context.value)
      contextResults.value = results
      return results
    } catch (error) {
      console.error('Error in context search:', error)
      contextResults.value = []
      return []
    } finally {
      isSearching.value = false
    }
  }

  /**
   * Convert context items to SearchResult format
   */
  function convertItemsToSearchResults(items: any[], searchContext: ReturnType<typeof getSearchContext>): SearchResult[] {
    if (!searchContext.type) return []

    switch (searchContext.type) {
      case 'software':
        return items.map((item: any) => ({
          type: 'software' as const,
          id: item.id,
          title: item.name,
          subtitle: item.creator || 'Unknown Creator',
          url: '/software',
          metadata: {}
        }))

      case 'kits':
        return items.map((item: any) => ({
          type: 'kit' as const,
          id: item.id,
          title: item.name,
          subtitle: item.creator || 'Unknown Creator',
          url: '/kits',
          metadata: {}
        }))

      case 'kits':
        return items.map((item: any) => ({
          type: 'kit' as const,
          id: item.id,
          title: item.name,
          subtitle: item.creator || 'Unknown Creator',
          url: '/kits',
          metadata: {}
        }))

      case 'tracks':
        return items.map((item: any) => {
          const username = searchContext.owner || ''
          return {
            type: 'track' as const,
            id: item.id,
            title: item.title || 'Untitled',
            subtitle: item.artist || 'Unknown Artist',
            url: `/u/${username}/t/track-${item.id}`,
            metadata: {
              username,
              ownerId: item.user_id
            }
          }
        })

      case 'collections':
        return items.map((item: any) => {
          const username = searchContext.owner || ''
          return {
            type: 'collection' as const,
            id: item.id,
            title: item.name,
            subtitle: item.description || undefined,
            url: `/u/${username}/c/${item.slug}`,
            metadata: {
              username,
              slug: item.slug
            }
          }
        })

      default:
        return []
    }
  }

  /**
   * Search with debouncing
   */
  function performSearch(query: string, contextItems?: any[], searchFields?: string[]) {
    searchQuery.value = query

    if (!query.trim()) {
      siteResults.value = []
      contextResults.value = []
      return
    }

    debounce(async () => {
      // Always perform site-wide search
      await searchSitewide(query)

      // Perform context search if context exists and items are provided
      if (hasContext.value && contextItems && searchFields) {
        await searchContext(query, contextItems, searchFields)
      }
    }, 300)
  }

  /**
   * Clear search results
   */
  function clearSearch() {
    searchQuery.value = ''
    siteResults.value = []
    contextResults.value = []
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
      debounceTimer.value = null
    }
  }

  return {
    searchQuery,
    siteResults,
    contextResults,
    isSearching,
    context,
    hasContext,
    searchSitewide,
    searchContext,
    performSearch,
    clearSearch
  }
}

