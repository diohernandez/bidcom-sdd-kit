import type { DetectedStack } from "../../types/stack.js";

export interface StateTransition {
  at: string;
  from: string;
  to: string;
  by: string;
  reason: string;
}

export interface StateApproval {
  number: number;
  approved_by: string;
  email: string;
  at: string;
  from_state: string;
  to_state: string;
  comment: string;
}

export interface StateRequirementChange {
  at: string;
  component: string;
  change: string;
  justification: string;
}

export interface StateSpecsBaseline {
  mode: string | null;
  note: string | null;
  capabilities: string[];
}

export interface StateGate {
  functional: unknown | null;
  technical: unknown | null;
  tasks: unknown | null;
}

export interface StateArchive {
  archived: boolean;
  archived_at: string | null;
  archive_path: string | null;
  merged_capabilities: string[];
}

export interface StackDetected extends DetectedStack {
  ui_library?: string;
  [key: string]: unknown;
}

export interface StateData {
  schema_version: string;
  feature_name: string;
  state: string;
  created_at: string;
  created_by: string;
  created_by_email: string;
  last_updated: string;
  completed_at?: string;
  stack_detected: StackDetected;
  domain: string;
  contributors: Array<Record<string, unknown>>;
  knowledge_lineage: Array<Record<string, unknown>>;
  transitions: StateTransition[];
  approvals: StateApproval[];
  requirement_changes: StateRequirementChange[];
  specs_baseline: StateSpecsBaseline;
  gates: StateGate;
  archive: StateArchive;
  extra: Record<string, unknown>;
}

export interface StateInitOptions {
  featureName: string;
  createdBy: string;
  createdByEmail?: string;
  stackDetected: StackDetected;
  domain?: string;
}

export interface StateTransitionOptions {
  from: string;
  to: string;
  reason: string;
  actor: string;
}

export interface StateApprovalOptions {
  actor: string;
  email?: string;
  comment: string;
}
