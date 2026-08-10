import { createClient } from '@supabase/supabase-js'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { createRequire } from 'module'

// Helper function to resolve ffmpeg path
function getFfmpegPath() {
  let ffmpegPath = ffmpegStatic
  
  // If the path from ffmpeg-static doesn't exist, try to resolve it
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    try {
      // Use createRequire to resolve in ESM context
      const require = createRequire(import.meta.url)
      const ffmpegStaticModulePath = require.resolve('ffmpeg-static')
      const moduleDir = path.dirname(ffmpegStaticModulePath)
      const binaryPath = path.join(moduleDir, 'ffmpeg')
      
      if (fs.existsSync(binaryPath)) {
        ffmpegPath = binaryPath
      }
    } catch (e) {
      // Try alternative paths
      const possiblePaths = [
        path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
        path.resolve(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg')
      ]
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          ffmpegPath = possiblePath
          break
        }
      }
    }
  }
  
  return ffmpegPath || 'ffmpeg' // Fallback to system ffmpeg
}

// Set ffmpeg path globally
const resolvedFfmpegPath = getFfmpegPath()
ffmpeg.setFfmpegPath(resolvedFfmpegPath)

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || ''
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error('R2 configuration missing')
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })
}

async function downloadR2Object(key) {
  const bucket = process.env.R2_BUCKET?.trim()
  if (!bucket) {
    throw new Error('R2_BUCKET is not configured')
  }

  const client = getR2Client()
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )

  if (!response.Body) {
    throw new Error('Empty R2 response body')
  }

  const bytes = await response.Body.transformToByteArray()
  return Buffer.from(bytes)
}

const downloadSampleHandler = async (event, context) => {
  try {
    // Parse query parameters
    // The builder provides rawQuery directly (not queryStringParameters)
    let trackId, storagePath, username
    
    // Try queryStringParameters first (standard Lambda format)
    if (event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0) {
      trackId = event.queryStringParameters.trackId
      storagePath = event.queryStringParameters.storagePath
      username = event.queryStringParameters.username
    }
    
    // If not found, parse from rawQuery (builder format)
    if (!trackId || !storagePath || !username) {
      const rawQuery = event.rawQuery || event.rawQueryString
      if (rawQuery) {
        const params = new URLSearchParams(rawQuery)
        trackId = trackId || params.get('trackId')
        storagePath = storagePath || params.get('storagePath')
        username = username || params.get('username')
      }
    }
    
    if (!trackId || !storagePath || !username) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Missing required parameters: trackId, storagePath, username',
          received: { trackId: !!trackId, storagePath: !!storagePath, username: !!username },
          debug: {
            hasQueryStringParameters: !!event.queryStringParameters,
            queryStringParameters: event.queryStringParameters,
            rawQueryString: event.rawQueryString,
            path: event.path,
            rawPath: event.rawPath,
            url: event.url,
            eventKeys: Object.keys(event)
          }
        })
      }
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: trackRow, error: trackError } = await supabase
      .from('sounds')
      .select('id, storage_path, storage_provider, title, artist')
      .eq('id', parseInt(trackId, 10))
      .maybeSingle()

    if (trackError || !trackRow?.storage_path) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Track not found' }),
      }
    }

    if (trackRow.storage_path !== storagePath) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Storage path mismatch' }),
      }
    }

    const storageProvider = trackRow.storage_provider || 'supabase'

    // Create temp directory for processing
    const tempDir = path.join(tmpdir(), `sample-${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })

    // Use source file extension so ffmpeg can handle m4a and other formats correctly
    const sourceExt = (path.extname(storagePath) || '.mp3').toLowerCase()
    const originalPath = path.join(tempDir, `original${sourceExt}`)
    const watermarkPath = path.join(tempDir, 'watermark.mp3')
    const outputPath = path.join(tempDir, 'sample.mp3')

    try {
      // Step 1: Download original audio file from storage
      let audioBuffer
      if (storageProvider === 'r2') {
        audioBuffer = await downloadR2Object(storagePath)
      } else {
        const { data: audioData, error: downloadError } = await supabase.storage
          .from('sounds')
          .download(storagePath)

        if (downloadError || !audioData) {
          throw new Error(`Failed to download audio: ${downloadError?.message || 'Unknown error'}`)
        }

        const arrayBuffer = await audioData.arrayBuffer()
        audioBuffer = Buffer.from(arrayBuffer)
      }

      fs.writeFileSync(originalPath, audioBuffer)

      // Step 2: Generate watermark audio using OpenAI TTS
      // Note: OpenRouter doesn't support TTS endpoints, so we use OpenAI's API directly
      // You'll need an OpenAI API key (not OpenRouter) for TTS functionality
      const openaiApiKey = process.env.OPENAI_API_KEY
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable. Note: OpenRouter does not support TTS endpoints, so you need an OpenAI API key for this feature.')
      }
      
      const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: username,
          voice: 'alloy',
          response_format: 'mp3',
          speed: 0.8 // Slower speech (0.25-4.0, default 1.0)
        })
      })

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text()
        throw new Error(`TTS API error: ${ttsResponse.status} - ${errorText}`)
      }

      // Save watermark audio
      const watermarkBuffer = await ttsResponse.arrayBuffer()
      fs.writeFileSync(watermarkPath, Buffer.from(watermarkBuffer))

      // Step 3: Process audio with ffmpeg
      // Clip to 30 seconds and mix watermark at 0s, 5s, 10s, 15s, 20s, 25s
      await new Promise((resolve, reject) => {
        // Mix original (clipped to 30s) with watermarks every 5 seconds
        ffmpeg(originalPath)
          .setDuration(30) // Clip to 30 seconds
          .input(watermarkPath)
          .input(watermarkPath)
          .input(watermarkPath)
          .input(watermarkPath)
          .input(watermarkPath)
          .input(watermarkPath)
          .complexFilter([
            // Keep original track at consistent volume
            '[0:a]volume=0.8[original]',
            // Process watermarks: slow down and increase volume (volume=1.5 instead of 2.0 to prevent volume spikes)
            '[1:a]atempo=0.75,volume=1.5[wm1]',
            '[2:a]atempo=0.75,volume=1.5[wm2]',
            '[3:a]atempo=0.75,volume=1.5[wm3]',
            '[4:a]atempo=0.75,volume=1.5[wm4]',
            '[5:a]atempo=0.75,volume=1.5[wm5]',
            '[6:a]atempo=0.75,volume=1.5[wm6]',
            // Delay watermarks to specific times (every 5 seconds)
            '[wm1]adelay=0|0[wm0]',
            '[wm2]adelay=5000|5000[wm5s]',
            '[wm3]adelay=10000|10000[wm10s]',
            '[wm4]adelay=15000|15000[wm15s]',
            '[wm5]adelay=20000|20000[wm20s]',
            '[wm6]adelay=25000|25000[wm25s]',
            // Mix original with all watermarks, then apply limiter to keep consistent volume
            '[original][wm0][wm5s][wm10s][wm15s][wm20s][wm25s]amix=inputs=7:duration=first:dropout_transition=2:normalize=0,alimiter=level_in=1:level_out=0.8:limit=0.9'
          ])
          .outputOptions([
            '-acodec', 'libmp3lame',
            '-b:a', '192k'
          ])
          .output(outputPath)
          .on('end', resolve)
          .on('error', (err) => {
            console.error('FFmpeg error:', err)
            reject(err)
          })
          .run()
      })

      // Step 4: Read processed file and return
      const sampleBuffer = fs.readFileSync(outputPath)
      
      // Cleanup temp files
      fs.rmSync(tempDir, { recursive: true, force: true })

      let filename = `sample-${trackId}.mp3`

      if (trackRow.title || trackRow.artist) {
        const trackName = trackRow.title
          ? trackRow.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
          : 'untitled'
        const artistName = trackRow.artist
          ? trackRow.artist.replace(/[^a-z0-9]/gi, '-').toLowerCase()
          : 'unknown'

        filename = `${trackName}-${artistName}.mp3`
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': sampleBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: sampleBuffer.toString('base64'),
        isBase64Encoded: true
      }

    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }

      console.error('Error processing sample:', error)
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Failed to process sample',
          message: error.message 
        })
      }
    }
  } catch (error) {
    console.error('Handler error:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    }
  }
}

export const handler = downloadSampleHandler

