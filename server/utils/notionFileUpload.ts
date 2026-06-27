const NOTION_VERSION = '2026-03-11'

interface FileUploadResponse {
  id?: string
  status?: string
  message?: string
}

export async function uploadBufferToNotion(params: {
  apiKey: string
  buffer: Buffer
  filename: string
  contentType: string
}): Promise<string> {
  const { apiKey, buffer, filename, contentType } = params

  const createRes = await fetch('https://api.notion.com/v1/file_uploads', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      filename: filename.slice(0, 255),
      content_type: contentType,
    }),
  })

  const created = await createRes.json().catch(() => null) as FileUploadResponse | null
  if (!createRes.ok || !created?.id) {
    throw new Error(`Notion file upload create failed: ${created?.message || createRes.statusText}`)
  }

  const form = new FormData()
  const blob = new Blob([buffer], { type: contentType })
  form.append('file', blob, filename)

  const sendRes = await fetch(`https://api.notion.com/v1/file_uploads/${created.id}/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
    },
    body: form,
  })

  const sent = await sendRes.json().catch(() => null) as FileUploadResponse | null
  if (!sendRes.ok || sent?.status !== 'uploaded') {
    throw new Error(`Notion file upload send failed: ${sent?.message || sendRes.statusText}`)
  }

  return created.id
}
