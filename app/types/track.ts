export interface Track {
  id: number
  user_id: string
  title: string
  artist: string
  storage_path: string
  duration: number
  version?: string
  genre?: string
  mood?: string
  bpm?: number | null
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

