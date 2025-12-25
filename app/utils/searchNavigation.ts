/**
 * Navigation utilities for search results
 */

import { scrollToItem, type ScrollableItemType } from './scrollToItem'
import type { RouteLocationNormalized } from 'vue-router'

export interface SearchResult {
  type: 'software' | 'track' | 'collection' | 'user' | 'kit'
  id: string | number
  title: string
  subtitle?: string
  url: string
  metadata?: {
    username?: string
    slug?: string
    ownerId?: string
    ownerUsername?: string
    [key: string]: any
  }
}

export type NavigationAction = 'navigate' | 'scroll' | 'both'

/**
 * Generate a track slug from track data
 */
function generateTrackSlug(track: { title?: string; id: number }): string {
  if (track.title) {
    const slug = track.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `${slug}-${track.id}`
  }
  return `track-${track.id}`
}

/**
 * Get URL for a search result item
 */
export function getItemUrl(item: SearchResult, view: 'detail' | 'listing' = 'listing'): string {
  switch (item.type) {
    case 'track':
      // Tracks always have detail pages
      if (view === 'detail' && item.metadata?.username) {
        return `/u/${item.metadata.username}/t/${generateTrackSlug({ title: item.title, id: Number(item.id) })}`
      }
      // Listing = profile page
      if (item.metadata?.username) {
        return `/u/${item.metadata.username}`
      }
      if (item.metadata?.ownerUsername) {
        return `/u/${item.metadata.ownerUsername}`
      }
      return '/'
    
    case 'collection':
      // Collections have detail pages
      if (view === 'detail' && item.metadata?.username && item.metadata?.slug) {
        return `/u/${item.metadata.username}/c/${item.metadata.slug}`
      }
      // Listing = collections list page
      if (item.metadata?.username) {
        return `/u/${item.metadata.username}/collections`
      }
      return '/'
    
    case 'software':
      // Software has no detail pages, always go to listing
      return '/software'
    
    case 'kit':
      // Kits have no detail pages, always go to listing
      return '/kits'
    
    case 'user':
      // Users/profiles: username or ID
      if (item.metadata?.username) {
        return `/u/${item.metadata.username}`
      }
      if (typeof item.id === 'string') {
        return `/u/${item.id}`
      }
      return '/'
    
    default:
      return '/'
  }
}

/**
 * Determine navigation action based on current route and item
 */
export function determineNavigationAction(
  item: SearchResult,
  currentRoute: RouteLocationNormalized | null
): NavigationAction {
  if (!currentRoute) return 'navigate'

  const currentPath = currentRoute.path

  // For context search results, check if we're on the same page
  switch (item.type) {
    case 'track':
      // If on profile page of track owner, can scroll
      if (item.metadata?.username && currentPath.startsWith(`/u/${item.metadata.username}`)) {
        // Check if we're not on a specific track detail page
        if (!currentPath.match(/\/u\/[^/]+\/t\/.+/)) {
          return 'both' // Can scroll or navigate to detail
        }
      }
      // If on collection page that contains this track
      if (item.metadata?.collectionId && currentPath.includes('/c/')) {
        return 'both'
      }
      return 'navigate'
    
    case 'collection':
      // If on user's collections list page, can scroll
      if (item.metadata?.username && currentPath === `/u/${item.metadata.username}/collections`) {
        return 'both'
      }
      return 'navigate'
    
    case 'software':
      // If on software page, can scroll
      if (currentPath === '/software') {
        return 'both'
      }
      return 'navigate'
    
    case 'kit':
      // If on kits page, can scroll
      if (currentPath === '/kits') {
        return 'both'
      }
      return 'navigate'
    
    default:
      return 'navigate'
  }
}

/**
 * Navigate to an item's page
 */
export function navigateToItem(item: SearchResult, view: 'detail' | 'listing' = 'listing'): void {
  if (typeof window === 'undefined') return

  const url = getItemUrl(item, view)
  
  // Use navigateTo for Nuxt 3
  navigateTo(url)
}

/**
 * Scroll to item if it's on the current page
 */
export function scrollToItemInPage(item: SearchResult): boolean {
  if (typeof window === 'undefined') return false

  const typeMap: Record<string, ScrollableItemType> = {
    track: 'track',
    software: 'resource',
    kit: 'resource',
    collection: 'collection'
  }

  const scrollType = typeMap[item.type]
  if (!scrollType || typeof item.id !== 'number') {
    return false
  }

  return scrollToItem(scrollType, item.id)
}

/**
 * Handle item click from search results
 * Determines whether to scroll, navigate, or both
 */
export function handleSearchResultClick(
  item: SearchResult,
  currentRoute: RouteLocationNormalized | null,
  preferredAction?: 'scroll' | 'navigate'
): void {
  const action = preferredAction || determineNavigationAction(item, currentRoute)

  if (action === 'scroll') {
    scrollToItemInPage(item)
  } else if (action === 'navigate') {
    // For items with detail pages, navigate to detail. Otherwise, navigate to listing.
    const hasDetailPage = item.type === 'track' || item.type === 'collection'
    navigateToItem(item, hasDetailPage ? 'detail' : 'listing')
  } else {
    // 'both' - try to scroll first, if that fails or item not found, navigate
    const scrolled = scrollToItemInPage(item)
    if (!scrolled) {
      const hasDetailPage = item.type === 'track' || item.type === 'collection'
      navigateToItem(item, hasDetailPage ? 'detail' : 'listing')
    }
  }
}

