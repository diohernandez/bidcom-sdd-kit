export interface UserStory {
  id: string;
  role: string;
  action: string;
  benefit: string;
  raw: string;
}

export interface Task {
  id: string;
  title: string;
  requirements: string[];
}

export interface ConsistencyIssue {
  type: "story-orphan" | "requirement-orphan" | "task-orphan" | "task-unknown-requirement";
  id: string;
  detail: string;
}

export interface CoverageReport {
  valid: boolean;
  stories: UserStory[];
  requirements: string[];
  tasks: Task[];
  issues: ConsistencyIssue[];
}

export interface AnalyzeOptions {
  featureName: string;
  projectPath: string;
  wipPath: string;
  specsPath: string;
}
