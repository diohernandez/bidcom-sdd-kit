export interface NodePackageManifest {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}
export declare function readNodeDependencies(projectPath: string): Promise<Record<string, string> | undefined>;
export declare function readPythonManifestBlob(projectPath: string): Promise<string | undefined>;
