export interface ArchiveResult {
  success: boolean;
  featureName: string;
  archivedAt: string;
  archivePath: string;
  snapshotPath?: string;
  mergedCapabilities?: string[];
  error?: string;
}

export interface ArchiveOptions {
  featureName: string;
  projectPath: string;
  wipPath: string;
  archivePath: string;
  specsPath: string;
  backupPath: string;
}
