/**
 * Search context detection and management
 */

import type { RouteLocationNormalized } from 'vue-router'

export type SearchContextType = 'software' | 'kits' | 'tracks' | 'collections' | null

export interface SearchContext {
  type: SearchContextType
  owner?: string // username or user_id
  additionalData?: Record<string, any>
}

/**
 * Get search context from current route
 */
export function getSearchContext(route: RouteLocationNormalized | null): SearchContext {
  if (!route) return { type: null }

  const path = route.path

  // Software page
  if (path === '/software' || path.startsWith('/software')) {
    return { type: 'software' }
  }

  // Kits page
  if (path === '/kits' || path.startsWith('/kits')) {
    return { type: 'kits' }
  }

  // Profile page - tracks context
  if (path.match(/^\/u\/[^/]+$/)) {
    const username = route.params.id || route.params.username
    return {
      type: 'tracks',
      owner: username as string
    }
  }

  // Collection detail page - tracks context
  if (path.match(/^\/u\/[^/]+\/c\/[^/]+$/)) {
    const username = route.params.username
    return {
      type: 'tracks',
      owner: username as string,
      additionalData: {
        collectionSlug: route.params.collection
      }
    }
  }

  // Track group page - tracks context
  if (path.match(/^\/u\/[^/]+\/g\/[^/]+$/)) {
    const username = route.params.username
    return {
      type: 'tracks',
      owner: username as string,
      additionalData: {
        groupName: route.params.group
      }
    }
  }

  // Collections list page - collections context
  if (path.match(/^\/u\/[^/]+\/collections$/)) {
    const username = route.params.username
    return {
      type: 'collections',
      owner: username as string
    }
  }

  // Track detail page - no context (single item view)
  if (path.match(/^\/u\/[^/]+\/t\/.+/)) {
    return { type: null }
  }

  // Default: no context
  return { type: null }
}

/**
 * Check if a route supports context search
 */
export function hasContextSearch(route: RouteLocationNormalized | null): boolean {
  const context = getSearchContext(route)
  return context.type !== null
}

