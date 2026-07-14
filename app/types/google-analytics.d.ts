type GtagParameters = Record<string, unknown>

type GtagArguments =
  | ['js', Date]
  | ['config', string, GtagParameters?]
  | ['event', string, GtagParameters?]
  | ['set', string, GtagParameters]

interface Window {
  dataLayer: GtagArguments[]
  gtag: (...args: GtagArguments) => void
}