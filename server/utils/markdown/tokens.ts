/** Cloudflare-style rough token estimate for x-markdown-tokens. */
export function estimateMarkdownTokens(markdown: string): number {
  return Math.ceil(markdown.length / 4)
}
