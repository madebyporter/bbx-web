import type { StorageProvider } from '~/types/track'

export type ArtworkSelection =
  | { kind: 'unchanged' }
  | { kind: 'file'; file: File; previewUrl: string; isVideo: boolean }
  | { kind: 'reuse'; path: string; provider: StorageProvider }
  | { kind: 'remove' }

export type ArtworkGenerateContext = {
  title: string
  artist: string
  genre?: string
  mood?: string
}

export function isArtworkSelectionDirty(selection: ArtworkSelection): boolean {
  return selection.kind !== 'unchanged'
}
