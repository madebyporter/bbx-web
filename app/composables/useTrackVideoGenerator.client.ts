import { ref } from 'vue'
import { fetchFile } from '@ffmpeg/util'
import type { FFmpeg } from '@ffmpeg/ffmpeg'

export interface TrackVideoGenerationResult {
  blob: Blob
  filename: string
}

export interface TrackVideoGenerationProgress {
  stage: 'loading-encoder' | 'preparing' | 'encoding'
  progress: number
  message: string
}

const CORE_JS = '/ffmpeg/ffmpeg-core.js'
const CORE_WASM = '/ffmpeg/ffmpeg-core.wasm'
const LOAD_TIMEOUT_MS = 300_000

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null
let workerUrlPromise: Promise<string> | null = null

function getFileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName

  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  if (file.type === 'audio/mpeg') return 'mp3'
  if (file.type === 'audio/wav' || file.type === 'audio/wave') return 'wav'
  if (file.type === 'audio/aiff' || file.type === 'audio/x-aiff') return 'aiff'
  return 'bin'
}

function getAudioExtensionFromPath(storagePath: string): string {
  const ext = storagePath.split('.').pop()?.toLowerCase()
  if (ext === 'mp3' || ext === 'wav' || ext === 'aif' || ext === 'aiff') {
    return ext === 'aif' ? 'aiff' : ext
  }
  return 'mp3'
}

function sanitizeFilename(title: string): string {
  const sanitized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return sanitized || 'track'
}

function formatLoadError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return new Error('Failed to load encoder')
}

function formatClockTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds)
  const mins = Math.floor(safeSeconds / 60)
  const secs = Math.floor(safeSeconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function parseFfmpegLogTime(message: string): number | null {
  const match = message.match(/time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  return hours * 3600 + minutes * 60 + seconds
}

function parseFfmpegLogSpeed(message: string): number | null {
  const match = message.match(/speed=\s*([\d.]+)x/)
  if (!match) return null
  const speed = Number(match[1])
  return Number.isFinite(speed) ? speed : null
}

function buildEncodingProgressMessage(
  encodedSeconds: number,
  totalSeconds: number,
  speed: number | null
): string {
  const encodedLabel = formatClockTime(encodedSeconds)
  const totalLabel = formatClockTime(totalSeconds)
  const speedLabel = speed ? ` · ${speed.toFixed(1)}× realtime` : ''
  return `Encoding ${encodedLabel} / ${totalLabel}${speedLabel}`
}

function reportEncodingProgressFromLog(
  message: string,
  audioDurationSeconds: number,
  onProgress?: (progress: TrackVideoGenerationProgress) => void
): void {
  if (!onProgress || audioDurationSeconds <= 0) return

  const encodedSeconds = parseFfmpegLogTime(message)
  if (encodedSeconds == null) return

  const speed = parseFfmpegLogSpeed(message)
  const progress = Math.min(99, Math.round((encodedSeconds / audioDurationSeconds) * 100))

  onProgress({
    stage: 'encoding',
    progress,
    message: buildEncodingProgressMessage(encodedSeconds, audioDurationSeconds, speed),
  })
}

async function getWorkerUrl(): Promise<string> {
  if (!workerUrlPromise) {
    workerUrlPromise = import('@ffmpeg/ffmpeg/worker?url').then((module) => module.default)
  }
  return workerUrlPromise
}

async function loadFfmpeg(
  onProgress?: (progress: TrackVideoGenerationProgress) => void
): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance
  }

  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise
  }

  ffmpegLoadPromise = new Promise<FFmpeg>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      terminateTrackVideoGenerator()
      reject(
        new Error(
          'Encoder load timed out. Try refreshing the page. The first load compiles ~31MB of WebAssembly and can take a few minutes.'
        )
      )
    }, LOAD_TIMEOUT_MS)

    void (async () => {
      try {
        onProgress?.({
          stage: 'loading-encoder',
          progress: 10,
          message: 'Loading encoder...',
        })

        const [{ FFmpeg }, classWorkerURL] = await Promise.all([
          import('@ffmpeg/ffmpeg'),
          getWorkerUrl(),
        ])

        const ffmpeg = new FFmpeg()
        ffmpegInstance = ffmpeg

        const origin = window.location.origin
        const coreURL = `${origin}${CORE_JS}`
        const wasmURL = `${origin}${CORE_WASM}`

        onProgress?.({
          stage: 'loading-encoder',
          progress: 30,
          message: 'Initializing encoder (first time can take 1–3 min)...',
        })

        await ffmpeg.load({
          classWorkerURL,
          coreURL,
          wasmURL,
        })

        onProgress?.({
          stage: 'loading-encoder',
          progress: 100,
          message: 'Encoder ready',
        })

        clearTimeout(timeoutId)
        resolve(ffmpeg)
      } catch (error) {
        clearTimeout(timeoutId)
        terminateTrackVideoGenerator()
        reject(formatLoadError(error))
      }
    })()
  })

  try {
    return await ffmpegLoadPromise
  } catch (error) {
    ffmpegLoadPromise = null
    throw error
  }
}

export function isTrackVideoEncoderLoaded(): boolean {
  return !!ffmpegInstance?.loaded
}

/** Preload ffmpeg when the drawer opens so Generate is faster. */
export function preloadTrackVideoEncoder(
  onProgress?: (progress: TrackVideoGenerationProgress) => void
): Promise<FFmpeg> {
  return loadFfmpeg(onProgress)
}

export function terminateTrackVideoGenerator(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate()
    ffmpegInstance = null
    ffmpegLoadPromise = null
  }
}

export function useTrackVideoGenerator() {
  const isGenerating = ref(false)

  const generateTrackVideo = async ({
    coverFile,
    audioBlob,
    audioStoragePath,
    trackTitle,
    audioDurationSeconds,
    onProgress,
    signal,
  }: {
    coverFile: File
    audioBlob: Blob
    audioStoragePath: string
    trackTitle: string
    audioDurationSeconds: number
    onProgress?: (progress: TrackVideoGenerationProgress) => void
    signal?: AbortSignal
  }): Promise<TrackVideoGenerationResult> => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    isGenerating.value = true

    try {
      const ffmpeg = await loadFfmpeg()

      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      onProgress?.({
        stage: 'preparing',
        progress: 0,
        message: 'Preparing files...',
      })

      const coverExt = getFileExtension(coverFile)
      const audioExt = getAudioExtensionFromPath(audioStoragePath)
      const coverName = `cover.${coverExt}`
      const audioName = `audio.${audioExt}`
      const outputName = 'output.mp4'
      const isGif = coverExt === 'gif'

      const audioFile = new File([audioBlob], audioName, {
        type: audioBlob.type || 'audio/mpeg',
      })

      await ffmpeg.writeFile(coverName, await fetchFile(coverFile), { signal })
      await ffmpeg.writeFile(audioName, await fetchFile(audioFile), { signal })

      onProgress?.({
        stage: 'encoding',
        progress: 0,
        message: 'Starting encode...',
      })

      const logHandler = ({ message }: { message: string }) => {
        reportEncodingProgressFromLog(message, audioDurationSeconds, onProgress)
      }

      ffmpeg.on('log', logHandler)

      const args = isGif
        ? [
            '-stream_loop',
            '-1',
            '-i',
            coverName,
            '-i',
            audioName,
            '-c:v',
            'libx264',
            '-preset',
            'ultrafast',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-shortest',
            outputName,
          ]
        : [
            '-loop',
            '1',
            '-framerate',
            '1',
            '-i',
            coverName,
            '-i',
            audioName,
            '-c:v',
            'libx264',
            '-preset',
            'ultrafast',
            '-tune',
            'stillimage',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-pix_fmt',
            'yuv420p',
            '-shortest',
            outputName,
          ]

      try {
        const exitCode = await ffmpeg.exec(args, undefined, { signal })
        if (exitCode !== 0) {
          throw new Error('Video encoding failed')
        }
      } finally {
        ffmpeg.off('log', logHandler)
      }

      const data = await ffmpeg.readFile(outputName, undefined, { signal })
      const uint8 = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
      const blob = new Blob([new Uint8Array(uint8)], { type: 'video/mp4' })
      const filename = `${sanitizeFilename(trackTitle)}-video.mp4`

      await Promise.all([
        ffmpeg.deleteFile(coverName).catch(() => undefined),
        ffmpeg.deleteFile(audioName).catch(() => undefined),
        ffmpeg.deleteFile(outputName).catch(() => undefined),
      ])

      onProgress?.({
        stage: 'encoding',
        progress: 100,
        message: 'Video ready',
      })

      return { blob, filename }
    } finally {
      isGenerating.value = false
    }
  }

  return {
    isGenerating,
    generateTrackVideo,
    terminateTrackVideoGenerator,
    preloadTrackVideoEncoder,
  }
}
