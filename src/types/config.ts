import type { DetectedStack } from './stack.js'

export type Locale = 'es' | 'en'

export interface MutationConfig {
  enforce: boolean
  threshold: number
}

export type WorkflowPhase = 'functional' | 'technical' | 'tasks' | 'impl' | 'validate'

export type ModelsConfig = Partial<Record<WorkflowPhase, string>>

export interface TelemetryConfig {
  enabled: boolean
  runsFile: string
}

export interface McpConfig {
  enabled: boolean
  port?: number
}

export interface SddConfig {
  // Paths
  sddPath: string
  wipPath: string
  reversePath: string
  knowledgePath: string
  specsPath: string
  archivePath: string

  // i18n
  locale: Locale

  // Stack
  stack: DetectedStack

  // Project
  projectName: string
  domain?: string

  // Templates
  templateOverrides?: Record<string, string>

  // MCP
  mcp?: McpConfig

  // Gate contract (FR34)
  mutation: MutationConfig

  // Drivers (FR42)
  models?: ModelsConfig

  // Telemetry (FR44)
  telemetry: TelemetryConfig
}

export type DefaultSddConfig = Omit<
  SddConfig,
  'stack' | 'projectName' | 'domain' | 'templateOverrides'
>

export const DEFAULT_CONFIG: DefaultSddConfig = {
  sddPath: '.sdd',
  wipPath: '.sdd/wip',
  reversePath: '.sdd/reverse',
  knowledgePath: '.sdd/knowledge',
  specsPath: 'specs',
  archivePath: '.sdd/archive',
  locale: 'es',
  mcp: { enabled: true },
  mutation: { enforce: false, threshold: 60 },
  telemetry: { enabled: true, runsFile: '.sdd/telemetry/runs.jsonl' },
}
