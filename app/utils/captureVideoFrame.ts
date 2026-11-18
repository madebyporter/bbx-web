/**
 * Capture a still frame from a video blob (first readable frame).
 */
export async function captureVideoFrameAsFile(
  videoBlob: Blob,
  filename = 'cover-from-video.png',
): Promise<File> {
  if (!import.meta.client) {
    throw new Error('Video frame capture is only available in the browser')
  }

  const objectUrl = URL.createObjectURL(videoBlob)

  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = objectUrl

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('Failed to load video for cover capture'))
    })

    const seekTo = Math.min(0.25, Number.isFinite(video.duration) ? video.duration * 0.05 : 0.25)
    if (seekTo > 0) {
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve()
        video.onerror = () => reject(new Error('Failed to seek video for cover capture'))
        try {
          video.currentTime = seekTo
        } catch {
          resolve()
        }
      })
    }

    const width = video.videoWidth || 1080
    const height = video.videoHeight || 1080
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable for cover capture')
    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) reject(new Error('Failed to encode cover frame'))
          else resolve(result)
        },
        'image/png',
      )
    })

    return new File([blob], filename, { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
