import { useAuthHeaders } from '~/composables/useAuthHeaders'

export type CoverGenerateReady = {
  base64: string
  mimeType: string
  filename: string
  provider?: string
  model?: string
}

const POLL_MS = 2000
const MAX_WAIT_MS = 14 * 60 * 1000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Start cover generation and wait until ready (polls job on Netlify background path).
 */
export async function generateCoverViaJob(body: {
  title: string
  artist: string
  genre?: string
  mood?: string
  direction?: string
  model?: string
}): Promise<CoverGenerateReady> {
  const headers = await useAuthHeaders()
  if (!headers.Authorization) {
    throw new Error('Sign in to generate a cover')
  }

  const started = await $fetch<{ jobId: string; status: string }>(
    '/api/integrations/cover/generate',
    {
      method: 'POST',
      headers,
      body,
    },
  )

  const jobId = started.jobId
  if (!jobId) {
    throw new Error('Cover job did not return a jobId')
  }

  const deadline = Date.now() + MAX_WAIT_MS
  while (Date.now() < deadline) {
    const job = await $fetch<{
      jobId: string
      status: 'pending' | 'ready' | 'failed'
      error?: string
      base64?: string
      mimeType?: string
      filename?: string
      provider?: string
      model?: string
    }>('/api/integrations/cover/job', {
      headers,
      query: { jobId },
    })

    if (job.status === 'ready' && job.base64) {
      return {
        base64: job.base64,
        mimeType: job.mimeType || 'image/png',
        filename: job.filename || 'cover-ai.png',
        provider: job.provider,
        model: job.model,
      }
    }

    if (job.status === 'failed') {
      throw new Error(job.error || 'Cover generation failed')
    }

    await sleep(POLL_MS)
  }

  throw new Error('Cover generation timed out. Try again or use Flare.')
}
