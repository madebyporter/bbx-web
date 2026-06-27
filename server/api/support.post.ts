import { createClient } from '@supabase/supabase-js'
import { createError, getHeader, readBody, readMultipartFormData } from 'h3'
import { createNotionSupportPage } from '../utils/notionSupport'
import { uploadBufferToNotion } from '../utils/notionFileUpload'
import {
  SUPPORT_IMAGE_TYPES,
  SUPPORT_LIMITS,
  type SupportSubmission,
  type SupportType,
} from '~/types/support'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isSupportType(value: string): value is SupportType {
  return value === 'Bugs' || value === 'Feedback'
}

interface SupportBody {
  type?: string
  name?: string
  email?: string
  subject?: string
  message?: string
  pageUrl?: string
}

function normalizeImageMime(mime: string): string {
  const base = mime.split(';')[0]?.trim().toLowerCase() || ''
  return base === 'image/jpg' ? 'image/jpeg' : base
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const notionApiKey = typeof config.notionApiKey === 'string' ? config.notionApiKey.trim() : ''
  const databaseId =
    typeof config.notionSupportDatabaseId === 'string' ? config.notionSupportDatabaseId.trim() : ''
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceKey

  if (!notionApiKey || !databaseId) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Support is temporarily unavailable.',
    })
  }

  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Support is temporarily unavailable.',
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session.' })
  }

  const contentTypeHeader = getHeader(event, 'content-type') || ''
  let typeRaw = ''
  let subject = ''
  let name = ''
  let email = ''
  let message = ''
  let pageUrl: string | undefined
  let fileBuffer: Buffer | null = null
  let fileFilename: string | null = null
  let fileMime: string | null = null

  if (contentTypeHeader.toLowerCase().includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    if (!parts?.length) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid multipart body.' })
    }

    for (const part of parts) {
      const field = part.name || ''
      if (field === 'file' && part.filename && part.data?.length) {
        fileBuffer = Buffer.from(part.data)
        fileFilename = String(part.filename).slice(0, 255)
        fileMime = normalizeImageMime(part.type || 'application/octet-stream')
      } else if (part.data) {
        const text = part.data.toString('utf8').trim()
        if (field === 'type') typeRaw = text
        else if (field === 'subject') subject = text
        else if (field === 'name') name = text
        else if (field === 'email') email = text
        else if (field === 'message') message = text
        else if (field === 'pageUrl' && text) pageUrl = text
      }
    }
  } else {
    const raw = await readBody<SupportBody>(event).catch(() => ({}))
    typeRaw = raw?.type != null ? String(raw.type).trim() : ''
    subject = raw?.subject != null ? String(raw.subject).trim() : ''
    name = raw?.name != null ? String(raw.name).trim() : ''
    email = raw?.email != null ? String(raw.email).trim() : ''
    message = raw?.message != null ? String(raw.message).trim() : ''
    if (raw?.pageUrl != null && String(raw.pageUrl).trim()) {
      pageUrl = String(raw.pageUrl).trim()
    }
  }

  typeRaw = typeRaw.trim()
  if (!isSupportType(typeRaw)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Type must be "Bugs" or "Feedback".',
    })
  }

  subject = subject.slice(0, SUPPORT_LIMITS.subjectMax)
  if (subject.length < SUPPORT_LIMITS.subjectMin) {
    throw createError({
      statusCode: 400,
      statusMessage: `Subject must be at least ${SUPPORT_LIMITS.subjectMin} characters.`,
    })
  }

  name = name.slice(0, SUPPORT_LIMITS.nameMax)
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required.' })
  }

  email = email.trim()
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required.' })
  }
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email.' })
  }

  message = message.slice(0, SUPPORT_LIMITS.messageMax)
  if (message.length < SUPPORT_LIMITS.messageMin) {
    throw createError({
      statusCode: 400,
      statusMessage: `Message must be at least ${SUPPORT_LIMITS.messageMin} characters.`,
    })
  }

  if (pageUrl != null && pageUrl !== '') {
    pageUrl = pageUrl.trim().slice(0, SUPPORT_LIMITS.pageUrlMax)
  } else {
    pageUrl = undefined
  }

  let screenshot: SupportSubmission['screenshot']
  if (fileBuffer && fileFilename && fileMime) {
    if (fileBuffer.byteLength > SUPPORT_LIMITS.attachmentMaxBytes) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Screenshot must be 4 MB or smaller.',
      })
    }
    if (!SUPPORT_IMAGE_TYPES.has(fileMime)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Screenshot must be a JPEG or PNG image.',
      })
    }

    try {
      const fileUploadId = await uploadBufferToNotion({
        apiKey: notionApiKey,
        buffer: fileBuffer,
        filename: fileFilename,
        contentType: fileMime,
      })
      screenshot = { fileUploadId, filename: fileFilename }
    } catch (error) {
      console.error('Notion screenshot upload failed:', error)
      throw createError({
        statusCode: 502,
        statusMessage: 'Could not upload screenshot. Try without a photo or try again later.',
      })
    }
  }

  const submission: SupportSubmission = {
    type: typeRaw,
    name,
    email,
    subject,
    message,
    pageUrl,
    screenshot,
  }

  try {
    const page = await createNotionSupportPage(notionApiKey, databaseId, submission)
    return { ok: true, id: page.id, url: page.url }
  } catch (error) {
    console.error('Notion support submission failed:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not send feedback. Please try again later.',
    })
  }
})
