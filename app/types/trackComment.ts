export interface TrackComment {
  id: number
  track_id: number
  collection_id: number | null
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: {
    username: string
    display_name?: string
  }
}
