export type Language = "typescript" | "python" | "go" | "rust" | "unknown";

export interface DetectedStackTesting {
  unit?: string[];
  e2e?: string[];
  visual?: string[];
}

export interface DetectedStack {
  language: Language;
  framework?: string;
  testing?: DetectedStackTesting;
  build?: string[];
  styling?: string[];
}
