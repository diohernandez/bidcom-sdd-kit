export interface PhaseResult {
  success: boolean;
  outputPath?: string;
  summary?: string;
  error?: string;
}

export interface WorkflowResult {
  success: boolean;
  featurePath?: string;
  nextSteps?: string[];
  error?: string;
}
