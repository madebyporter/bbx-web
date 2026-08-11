export interface WebMcpJsonSchema {
  type?: string
  properties?: Record<string, WebMcpJsonSchema>
  required?: string[]
  description?: string
  enum?: Array<string | number | boolean>
  items?: WebMcpJsonSchema
  additionalProperties?: boolean | WebMcpJsonSchema
}

export interface WebMcpToolDefinition {
  name: string
  description: string
  title?: string
  inputSchema: WebMcpJsonSchema
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>
  annotations?: {
    readOnlyHint?: boolean
    untrustedContentHint?: boolean
  }
}

export interface WebMcpRegisterToolOptions {
  signal?: AbortSignal
}

export interface WebMcpModelContext {
  registerTool: (
    tool: WebMcpToolDefinition,
    options?: WebMcpRegisterToolOptions,
  ) => void | Promise<void>
  getTools?: () => unknown[] | Promise<unknown[]>
}

declare global {
  interface Navigator {
    modelContext?: WebMcpModelContext
  }

  interface Document {
    modelContext?: WebMcpModelContext
  }
}

export {}
