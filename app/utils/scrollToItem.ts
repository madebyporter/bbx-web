/**
 * Utilities for scrolling to and highlighting items in lists
 */

export type ScrollableItemType = 'track' | 'resource' | 'collection'

/**
 * Scroll to a track by its ID
 */
export function scrollToTrack(trackId: number): boolean {
  return scrollToItem('track', trackId)
}

/**
 * Scroll to a resource by its ID
 */
export function scrollToResource(resourceId: number): boolean {
  return scrollToItem('resource', resourceId)
}

/**
 * Scroll to a collection by its ID
 */
export function scrollToCollection(collectionId: number): boolean {
  return scrollToItem('collection', collectionId)
}

/**
 * Generic function to scroll to any item type
 */
export function scrollToItem(type: ScrollableItemType, id: number): boolean {
  if (typeof window === 'undefined') return false

  const attributeMap = {
    track: 'data-track-id',
    resource: 'data-resource-id',
    collection: 'data-collection-id'
  }

  const attribute = attributeMap[type]
  const selector = `[${attribute}="${id}"]`
  const element = document.querySelector(selector)

  if (!element) {
    console.warn(`Element not found for ${type} with id ${id}`)
    return false
  }

  // Scroll to element
  element.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center',
    inline: 'nearest'
  })

  // Highlight the item temporarily
  highlightItem(selector)

  // Update URL hash for shareable deep links
  updateUrlHash(type, id)

  return true
}

/**
 * Highlight an item temporarily with visual feedback
 */
export function highlightItem(selector: string, duration: number = 2000): void {
  if (typeof window === 'undefined') return

  const element = document.querySelector(selector) as HTMLElement | null
  if (!element) return

  // Add highlight class
  element.classList.add('search-highlight')

  // Remove highlight after duration
  setTimeout(() => {
    element.classList.remove('search-highlight')
  }, duration)
}

/**
 * Update URL hash to support shareable deep links
 */
function updateUrlHash(type: ScrollableItemType, id: number): void {
  if (typeof window === 'undefined') return

  const hash = `#${type}-${id}`
  // Use history.replaceState to avoid adding to browser history
  window.history.replaceState(null, '', hash)
}

/**
 * Check for URL hash on page load and scroll to item if present
 */
export function handleUrlHash(): void {
  if (typeof window === 'undefined') return

  const hash = window.location.hash
  if (!hash) return

  // Parse hash format: #track-123, #resource-456, #collection-789
  const hashMatch = hash.match(/^#(track|resource|collection)-(\d+)$/)
  if (!hashMatch) return

  const [, type, idStr] = hashMatch
  const id = parseInt(idStr, 10)

  if (isNaN(id)) return

  // Wait a bit for page to render, then scroll
  setTimeout(() => {
    scrollToItem(type as ScrollableItemType, id)
  }, 300)
}

