export const TRACK_GRID_WIDTH = {
  tiny: '70px',
  /** Sticky actions: two icon hits (p-2 + 16px) + gap inside cell p-4 */
  actions: '98px',
  /** Version / Duration headers + cell padding */
  compact: '100px',
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
  // Logged-out / public grids have fewer columns — don't let Title's 1fr eat the row
  // and shove Duration off-screen.
  const publicCompactGrid =
    !analyticsMode && !showActions && !showCollection && !showStatus
  const titleCol = publicCompactGrid
    ? `minmax(${TRACK_GRID_WIDTH.medium}, ${TRACK_GRID_WIDTH.large})`
    : `minmax(${TRACK_GRID_WIDTH.medium}, 1fr)`
  const artistCol = analyticsMode ? TRACK_GRID_WIDTH.medium : TRACK_GRID_WIDTH.small

  const cols: string[] = [
    TRACK_GRID_WIDTH.tiny,
    titleCol,
    artistCol,
    TRACK_GRID_WIDTH.compact,
  ]

  if (analyticsMode) {
    cols.push(
      TRACK_GRID_WIDTH.tiny,
      TRACK_GRID_WIDTH.tiny,
      TRACK_GRID_WIDTH.small,
    )
  } else {
    if (showCollection) {
      cols.push(TRACK_GRID_WIDTH.medium)
    }
    cols.push(
      TRACK_GRID_WIDTH.small,
      TRACK_GRID_WIDTH.tiny,
      TRACK_GRID_WIDTH.compact,
    )
    if (showStatus) {
      cols.push(TRACK_GRID_WIDTH.small)
    }
  }

  if (showActions) {
    cols.push(TRACK_GRID_WIDTH.actions)
  }

  return cols.join(' ')
}

export function buildTrackGridStyle(options: TrackGridColumnOptions) {
  return {
    display: 'grid',
    width: 'max-content',
    minWidth: '100%',
    gap: '0',
    gridTemplateColumns: buildTrackGridTemplateColumns(options),
  }
}

/** Inner table width: fill viewport when narrow, grow with columns when scrolling. */
export const TRACK_TABLE_INNER_CLASS = 'min-w-full w-max h-fit'

/** Sticky right-frozen actions cell (same grid row as data cells). */
export const TRACK_TABLE_STICKY_ACTIONS_BASE_CLASS =
  'sticky right-0 z-[1] flex items-center justify-end self-stretch bg-neutral-900'

/** Live rows: match row hover / playing background on the sticky cell. */
export const TRACK_TABLE_STICKY_ACTIONS_CLASS =
  `${TRACK_TABLE_STICKY_ACTIONS_BASE_CLASS} group-hover:bg-neutral-800 group-[.is-playing]:bg-neutral-800`
