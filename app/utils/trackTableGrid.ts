export const TRACK_GRID_WIDTH = {
  tiny: '70px',
  small: '140px',
  medium: '280px',
  large: '560px',
  xl: '1120px',
} as const

export interface TrackGridColumnOptions {
  showCollection?: boolean
  showStatus?: boolean
  showActions?: boolean
  analyticsMode?: boolean
}

export function buildTrackGridTemplateColumns({
  showCollection = false,
  showStatus = false,
  showActions = false,
  analyticsMode = false,
}: TrackGridColumnOptions): string {
  const titleCol = `minmax(${TRACK_GRID_WIDTH.medium}, 1fr)`
  const artistCol = analyticsMode ? TRACK_GRID_WIDTH.medium : TRACK_GRID_WIDTH.small

  const cols: string[] = [
    TRACK_GRID_WIDTH.tiny,
    titleCol,
    artistCol,
    TRACK_GRID_WIDTH.tiny,
  ]

  if (analyticsMode) {
    cols.push(
      TRACK_GRID_WIDTH.tiny,
      TRACK_GRID_WIDTH.tiny,
      TRACK_GRID_WIDTH.small,
      TRACK_GRID_WIDTH.small
    )
  } else {
    if (showCollection) {
      cols.push(TRACK_GRID_WIDTH.medium)
    }
    cols.push(TRACK_GRID_WIDTH.small, TRACK_GRID_WIDTH.tiny, TRACK_GRID_WIDTH.tiny)
    if (showStatus) {
      cols.push(TRACK_GRID_WIDTH.small)
    }
  }

  if (showActions) {
    cols.push(TRACK_GRID_WIDTH.tiny)
  }

  return cols.join(' ')
}

export function buildTrackGridStyle(options: TrackGridColumnOptions) {
  return {
    display: 'grid',
    width: '100%',
    gap: '0',
    gridTemplateColumns: buildTrackGridTemplateColumns(options),
  }
}

/** Sticky right-frozen actions cell (same grid row as data cells). */
export const TRACK_TABLE_STICKY_ACTIONS_CLASS =
  'sticky right-0 z-[1] flex items-center justify-end self-stretch bg-neutral-900 group-hover:bg-neutral-800 group-[.is-playing]:bg-neutral-800'
