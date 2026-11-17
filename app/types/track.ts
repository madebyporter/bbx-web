export type StorageProvider = 'supabase' | 'r2'

export interface Track {
  id: number
  user_id: string
  title: string
  artist: string
  storage_path: string
  storage_provider?: StorageProvider
  artwork_path?: string | null
  artwork_provider?: StorageProvider
  duration: number
  version?: string
  genre?: string
  mood?: string
  bpm?: number | null
  key?: string | null
  /** Optional platform sync description; when empty, sync auto-builds from metadata. */
  description?: string | null
  year?: number | null
  collection_names?: string
  track_group_name?: string | null
  created_at?: string
  status_id?: number | null
  is_public?: boolean
  track_status?: {
    id: number
    name: string
  } | null
  [key: string]: any // Allow additional properties for flexibility
}

