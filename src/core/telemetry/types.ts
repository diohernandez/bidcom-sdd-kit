export interface TelemetryRun {
  at: string;
  feature: string;
  phase: string;
  success: boolean;
  exit_code?: number;
  checks: Array<{
    name: string;
    passed: boolean;
    detail?: string;
  }>;
  duration_ms: number;
}

export interface TelemetryConfig {
  enabled: boolean;
  runsFile: string;
}
