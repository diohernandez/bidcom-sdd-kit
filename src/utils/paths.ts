import path from 'node:path'
import type { SddConfig } from '../types/config.js'

type PathConfig = Pick<
  SddConfig,
  'sddPath' | 'wipPath' | 'reversePath' | 'specsPath' | 'archivePath'
>

export function resolveSddPath(projectPath: string, config: PathConfig): string {
  return path.join(projectPath, config.sddPath)
}

export function resolveWipPath(projectPath: string, config: PathConfig): string {
  return path.join(projectPath, config.wipPath)
}

export function resolveReversePath(projectPath: string, config: PathConfig): string {
  return path.join(projectPath, config.reversePath)
}

export function resolveSpecsPath(projectPath: string, config: PathConfig): string {
  return path.join(projectPath, config.specsPath)
}

export function resolveArchivePath(projectPath: string, config: PathConfig): string {
  return path.join(projectPath, config.archivePath)
}
