// Resource utilities for slug generation and management

/**
 * Generate a URL-friendly slug from a resource name
 * @param name - The resource name
 * @returns A lowercase, hyphenated slug
 */
export function generateResourceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Generate a unique slug by appending a number if needed
 * @param baseName - The resource name
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function generateUniqueResourceSlug(baseName: string, existingSlugs: string[]): string {
  let slug = generateResourceSlug(baseName)
  let counter = 1
  
  while (existingSlugs.includes(slug)) {
    slug = `${generateResourceSlug(baseName)}-${counter}`
    counter++
  }
  
  return slug
}

