import type { DetectedStack } from './stack.js';
export type Locale = 'es' | 'en';
export interface MutationConfig {
    enforce: boolean;
    threshold: number;
}
export type WorkflowPhase = 'functional' | 'technical' | 'tasks' | 'impl' | 'validate';
export type ModelsConfig = Partial<Record<WorkflowPhase, string>>;
export interface TelemetryConfig {
    enabled: boolean;
    runsFile: string;
}
export interface McpConfig {
    enabled: boolean;
    port?: number;
}
export interface SddConfig {
    sddPath: string;
    wipPath: string;
    reversePath: string;
    knowledgePath: string;
    specsPath: string;
    archivePath: string;
    locale: Locale;
    stack: DetectedStack;
    projectName: string;
    domain?: string;
    templateOverrides?: Record<string, string>;
    mcp?: McpConfig;
    mutation: MutationConfig;
    models?: ModelsConfig;
    telemetry: TelemetryConfig;
}
export type DefaultSddConfig = Omit<SddConfig, 'stack' | 'projectName' | 'domain' | 'templateOverrides'>;
export declare const DEFAULT_CONFIG: DefaultSddConfig;
