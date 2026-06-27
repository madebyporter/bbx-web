import type { SupportSubmission } from '~/types/support'
import { SUPPORT_LIMITS } from '~/types/support'

const NOTION_RICH_TEXT_CHUNK = 2000

function richTextChunks(text: string): Array<{ text: { content: string } }> {
  const chunks: Array<{ text: { content: string } }> = []
  for (let i = 0; i < text.length; i += NOTION_RICH_TEXT_CHUNK) {
    chunks.push({ text: { content: text.slice(i, i + NOTION_RICH_TEXT_CHUNK) } })
  }
  return chunks.length > 0 ? chunks : [{ text: { content: '' } }]
}

export async function createNotionSupportPage(
  apiKey: string,
  databaseId: string,
  submission: SupportSubmission
): Promise<{ id: string; url: string | null }> {
  const properties: Record<string, unknown> = {
    Name: {
      title: [{ text: { content: submission.subject.slice(0, SUPPORT_LIMITS.subjectMax) } }],
    },
    Type: {
      select: { name: submission.type },
    },
    Reporter: {
      rich_text: richTextChunks(submission.name.slice(0, SUPPORT_LIMITS.nameMax)),
    },
    Email: {
      email: submission.email,
    },
    Message: {
      rich_text: richTextChunks(submission.message.slice(0, SUPPORT_LIMITS.messageMax)),
    },
  }

  if (submission.pageUrl) {
    properties['Page URL'] = { url: submission.pageUrl }
  }

  if (submission.screenshot) {
    properties.Screenshot = {
      files: [
        {
          type: 'file_upload',
          file_upload: { id: submission.screenshot.fileUploadId },
          name: submission.screenshot.filename,
        },
      ],
    }
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2026-03-11',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  })

  const json = await response.json().catch(() => null) as {
    id?: string
    url?: string
    message?: string
  } | null

  if (!response.ok || !json?.id) {
    const detail = json?.message || response.statusText
    throw new Error(`Notion API error: ${detail}`)
  }

  return { id: json.id, url: json.url ?? null }
}
