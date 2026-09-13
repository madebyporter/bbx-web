export interface ToolCatalogItem {
  slug: string
  name: string
  description: string
  tags: string[]
  imageUrl: string
  href: string
}

export const TOOLS_CATALOG: ToolCatalogItem[] = [
  {
    slug: 'delay-reverb',
    name: 'Delay & Reverb Calculator',
    description: 'BPM-synced delay and reverb times',
    tags: ['DELAY', 'REVERB'],
    imageUrl: '/img/tools/delay-reverb.svg',
    href: '/tools/delay-reverb',
  },
]
