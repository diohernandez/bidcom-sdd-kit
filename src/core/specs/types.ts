export interface Scenario {
  title: string;
  steps: string[];
}

export interface Requirement {
  id: string;
  title: string;
  body: string;
  scenarios: Scenario[];
  previousTitle?: string;
}

export interface CapabilitySpec {
  type: "capability-spec";
  capability: string;
  title: string;
  tags: string[];
  timestamp: string;
  origin: "reverse-engineered" | "feature" | "baseline";
  requirements: Requirement[];
}

export interface CapabilityDelta {
  type: "capability-delta";
  capability: string;
  change_ref: string;
  status?: string;
  added: Requirement[];
  modified: Requirement[];
  removed: string[];
}

export interface MergeResult {
  spec: CapabilitySpec;
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
  };
}

export interface SpecStore {
  read(capability: string): Promise<CapabilitySpec | undefined>;
  write(spec: CapabilitySpec): Promise<void>;
  list(): Promise<string[]>;
}

export interface DeltaMerge {
  merge(baseline: CapabilitySpec, delta: CapabilityDelta): MergeResult;
  read(capability: string): Promise<CapabilityDelta | undefined>;
  write(delta: CapabilityDelta): Promise<void>;
}
