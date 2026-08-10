const SEO_DESCRIPTION_MAX = 160
const OPENAI_MODEL = 'gpt-5.4-nano'

export interface ResourceDescriptionContext {
  name?: string
  creator?: string
  tags?: string[]
  price?: string
  rawDescription?: string
}

function readOpenAiKey(): string {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.NUXT_OPENAI_API_KEY?.trim() ||
    ''
  )
}

export function hasOpenAiKey(): boolean {
  return Boolean(readOpenAiKey())
}

function trimToSeoLength(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= SEO_DESCRIPTION_MAX) return normalized
  return `${normalized.slice(0, SEO_DESCRIPTION_MAX - 3).trimEnd()}...`
}

function buildTruncatedDescription(raw: string): string {
  const base = raw.replace(/\s+/g, ' ').trim()
  if (base.length <= 500) return base
  return `${base.slice(0, 497).trimEnd()}...`
}

async function callOpenAiDescription(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  const apiKey = readOpenAiKey()
  if (!apiKey) return null

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        max_completion_tokens: 120,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) return null

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = data.choices?.[0]?.message?.content
      ?.replace(/\s+/g, ' ')
      .trim()

    return content ? trimToSeoLength(content) : null
  } catch {
    return null
  }
}

function buildContextLines(context: ResourceDescriptionContext): string[] {
  return [
    context.name ? `Product: ${context.name}` : null,
    context.creator ? `Creator: ${context.creator}` : null,
    context.price ? `Price: ${context.price}` : null,
    context.tags?.length ? `Tags: ${context.tags.join(', ')}` : null,
    context.rawDescription ? `Source description: ${context.rawDescription}` : null,
  ].filter((line): line is string => Boolean(line))
}

const OPTIMIZE_SYSTEM_PROMPT =
  'You write concise product descriptions for a music production software directory. ' +
  'Return one plain-text sentence (max 155 characters). Be factual, specific, and natural. ' +
  'Include the product name when provided. Weave in relevant tags only when they fit. ' +
  'No quotes, markdown, or hype.'

const GENERATE_SYSTEM_PROMPT =
  'You write concise product descriptions for a music production software and sounds directory. ' +
  'Use your knowledge of the product, creator, and category. Return one plain-text sentence ' +
  '(max 155 characters). Be factual and specific. Include the product name. Mention the creator ' +
  'when known. If details are uncertain, describe the product type without inventing features. ' +
  'No quotes, markdown, or hype.'

export async function optimizeResourceDescription(
  context: ResourceDescriptionContext
): Promise<string> {
  const raw = context.rawDescription?.replace(/\s+/g, ' ').trim() || ''
  if (!raw) return ''

  const optimized = await callOpenAiDescription(
    OPTIMIZE_SYSTEM_PROMPT,
    buildContextLines(context).join('\n')
  )

  return optimized || buildTruncatedDescription(raw)
}

export async function generateResourceDescription(
  context: ResourceDescriptionContext
): Promise<string | null> {
  const name = context.name?.trim()
  if (!name) return null

  const lines = buildContextLines({
    name: context.name,
    creator: context.creator,
    price: context.price,
    tags: context.tags,
  })

  if (lines.length === 0) return null

  return callOpenAiDescription(GENERATE_SYSTEM_PROMPT, lines.join('\n'))
}
