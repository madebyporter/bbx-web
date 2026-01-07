export interface TrackStatus {
  id: number
  user_id: string
  name: string
  created_at: string
}

export interface ProfileMember {
  id: number
  profile_id: string
  member_id: string
  invited_by: string | null
  created_at: string
}

export interface ResourceComment {
  id: number
  resource_id: number
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: {
    username: string
    display_name?: string
  }
}

export interface Resource {
  id: number
  name: string
  creator: string
  tags: string[]
  price: string
  os: string[]
  link: string
  image_url?: string
  type: string
  created_at: string
  updated_at: string
  submitted_by?: string
  status?: 'pending' | 'approved' | 'rejected'
  // Audio metadata fields
  user_id?: string
  storage_path?: string
  artist?: string
  collection?: string
  genre?: string
  mood?: string[]
  bpm?: number
  key?: string
  year?: number
  track_number?: number
  disc_number?: number
  file_size?: number
  duration?: number
  status_id?: number | null
  track_status?: TrackStatus | null
  is_public?: boolean
} 