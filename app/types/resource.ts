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
} 