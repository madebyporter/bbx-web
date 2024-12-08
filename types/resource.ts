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
} 