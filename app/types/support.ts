export type SupportType = 'Bugs' | 'Feedback'

export interface SupportSubmission {
  type: SupportType
  name: string
  email: string
  subject: string
  message: string
  pageUrl?: string
  screenshot?: {
    fileUploadId: string
    filename: string
  }
}

export const SUPPORT_LIMITS = {
  nameMax: 200,
  subjectMin: 3,
  subjectMax: 200,
  messageMin: 10,
  messageMax: 10000,
  pageUrlMax: 2000,
  attachmentMaxBytes: 4 * 1024 * 1024,
} as const

export const SUPPORT_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png'])
