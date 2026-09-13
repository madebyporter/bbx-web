export interface CopyCursorBubble {
  id: number
  text: string
  x: number
  y: number
}

/** Total lifetime: 420ms rise + 840ms fade */
const BUBBLE_LIFETIME_MS = 420 + 840

let nextId = 0

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to execCommand fallback
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export function useCopyCursorToast() {
  // useState shares across components (module-level refs can duplicate under Vite/HMR)
  const bubbles = useState<CopyCursorBubble[]>('copy-cursor-bubbles', () => [])

  const showCopied = (label: string, clientX: number, clientY: number) => {
    const id = ++nextId
    bubbles.value = [
      ...bubbles.value,
      {
        id,
        text: `copied ${label}`,
        x: clientX,
        y: clientY,
      },
    ]

    setTimeout(() => {
      bubbles.value = bubbles.value.filter((b) => b.id !== id)
    }, BUBBLE_LIFETIME_MS)
  }

  const copyValue = async (
    bareNumber: string,
    unit: 'ms' | 'hz',
    event: MouseEvent | PointerEvent
  ) => {
    const label = `${bareNumber}${unit}`
    // Always show feedback at cursor; clipboard may fail in restricted contexts
    showCopied(label, event.clientX, event.clientY)
    const ok = await writeClipboard(bareNumber)
    if (!ok) {
      console.error('Failed to copy value to clipboard')
    }
  }

  return {
    bubbles,
    showCopied,
    copyValue,
  }
}
