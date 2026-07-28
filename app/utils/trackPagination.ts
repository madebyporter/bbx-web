export const TRACK_PAGE_SIZE = 10

export function trackPageRange(page: number) {
  const from = page * TRACK_PAGE_SIZE
  return { from, to: from + TRACK_PAGE_SIZE - 1 }
}
