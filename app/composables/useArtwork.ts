import { useSupabase } from '~/utils/supabase'
import { sanitizeStorageFilename } from '~/utils/sanitizeStorageFilename'

export const ARTWORK_BUCKET = 'artwork'
export const ARTWORK_MAX_SIZE = 10 * 1024 * 1024
export const ARTWORK_MAX_DIMENSION = 1600

const STATIC_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov'])

export interface ProcessedArtwork {
  file: File
  preview: string
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function isAllowedArtworkMimeType(file: File): boolean {
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
    return true
  }

  return ALLOWED_EXTENSIONS.has(getFileExtension(file.name))
}

function isStaticImage(file: File): boolean {
  if (STATIC_IMAGE_TYPES.has(file.type)) {
    return true
  }

  const ext = getFileExtension(file.name)
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp'
}

function isGif(file: File): boolean {
  return file.type === 'image/gif' || getFileExtension(file.name) === 'gif'
}

function isVideoFile(file: File): boolean {
  return (
    file.type === 'video/mp4' ||
    file.type === 'video/quicktime' ||
    getFileExtension(file.name) === 'mp4' ||
    getFileExtension(file.name) === 'mov'
  )
}

export function isVideoArtwork(path: string | null | undefined): boolean {
  if (!path) return false
  const ext = getFileExtension(path)
  return ext === 'mp4' || ext === 'mov'
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read image'))
    }

    img.src = objectUrl
  })
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = await loadImageElement(file)
  return { width: img.naturalWidth, height: img.naturalHeight }
}

async function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)

    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: video.videoWidth, height: video.videoHeight })
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read video dimensions'))
    }

    video.src = objectUrl
  })
}

function exceedsMaxDimension(width: number, height: number): boolean {
  return width > ARTWORK_MAX_DIMENSION || height > ARTWORK_MAX_DIMENSION
}

async function downscaleStaticImage(file: File): Promise<File> {
  const img = await loadImageElement(file)
  const { width, height } = { width: img.naturalWidth, height: img.naturalHeight }

  if (!exceedsMaxDimension(width, height)) {
    return file
  }

  const scale = Math.min(ARTWORK_MAX_DIMENSION / width, ARTWORK_MAX_DIMENSION / height)
  const newWidth = Math.round(width * scale)
  const newHeight = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = newWidth
  canvas.height = newHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not process image')
  }

  ctx.drawImage(img, 0, 0, newWidth, newHeight)

  const mimeType = file.type || 'image/jpeg'
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error('Failed to downscale image'))
        }
      },
      mimeType,
      0.9
    )
  })

  return new File([blob], file.name, { type: mimeType })
}

async function createPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const result = event.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Could not create preview'))
      }
    }

    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export async function validateAndProcessArtwork(file: File): Promise<ProcessedArtwork> {
  if (!isAllowedArtworkMimeType(file)) {
    throw new Error('Artwork must be JPG, PNG, WebP, GIF, MP4, or MOV')
  }

  if (file.size > ARTWORK_MAX_SIZE) {
    throw new Error('Artwork must be less than 10MB')
  }

  let processedFile = file

  if (isStaticImage(file)) {
    processedFile = await downscaleStaticImage(file)
  } else if (isGif(file) || isVideoFile(file)) {
    const dimensions = isVideoFile(file)
      ? await getVideoDimensions(file)
      : await getImageDimensions(file)

    if (exceedsMaxDimension(dimensions.width, dimensions.height)) {
      throw new Error(`Artwork must be ${ARTWORK_MAX_DIMENSION}x${ARTWORK_MAX_DIMENSION} or smaller`)
    }
  } else {
    throw new Error('Unsupported artwork format')
  }

  const preview = await createPreview(processedFile)
  return { file: processedFile, preview }
}

export const useArtwork = () => {
  const { supabase } = useSupabase()

  const getArtworkUrl = (path: string | null | undefined): string | null => {
    if (!path || !supabase) return null

    const { data } = supabase.storage.from(ARTWORK_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  const uploadArtwork = async (file: File, userId: string): Promise<string> => {
    if (!supabase) {
      throw new Error('Storage is not available')
    }

    const timestamp = Date.now()
    const safeName = sanitizeStorageFilename(file.name)
    const filePath = `${userId}/${timestamp}-${safeName}`

    const { error } = await supabase.storage.from(ARTWORK_BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      throw new Error(`Failed to upload artwork: ${error.message}`)
    }

    return filePath
  }

  const deleteArtwork = async (path: string | null | undefined): Promise<void> => {
    if (!path || !supabase) return

    const { error } = await supabase.storage.from(ARTWORK_BUCKET).remove([path])
    if (error) {
      console.warn('Failed to delete artwork:', error)
    }
  }

  return {
    getArtworkUrl,
    isVideoArtwork,
    validateAndProcessArtwork,
    uploadArtwork,
    deleteArtwork,
  }
}
