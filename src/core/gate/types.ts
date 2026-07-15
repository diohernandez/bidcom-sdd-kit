export enum ExitCode {
  GREEN = 0,
  STRUCTURAL = 1,
  BUILD = 2,
  TESTS = 3,
  MUTATION = 4,
}

export interface GateCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface GateResult {
  gate: string;
  passed: boolean;
  exit_code: ExitCode;
  checks: GateCheck[];
}

export interface GateContext {
  featureName: string;
  featurePath: string;
  projectPath: string;
  phase: string;
}

export interface GateCheckRunner {
  name: string;
  run(context: GateContext): Promise<GateCheck>;
}

export interface GateConfig {
  mutation: {
    enforce: boolean;
    threshold: number;
  };
}

export interface GateRunOptions {
  context: GateContext;
  config: GateConfig;
  writeResult?: boolean;
}
