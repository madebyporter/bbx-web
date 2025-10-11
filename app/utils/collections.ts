// Collection utilities for slug generation and management

/**
 * Generate a URL-friendly slug from a collection name
 * @param name - The collection name
 * @returns A lowercase, hyphenated slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Generate a unique slug by appending a number if needed
 * @param baseName - The collection name
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function generateUniqueSlug(baseName: string, existingSlugs: string[]): string {
  let slug = generateSlug(baseName)
  let counter = 1
  
  while (existingSlugs.includes(slug)) {
    slug = `${generateSlug(baseName)}-${counter}`
    counter++
  }
  
  return slug
}

