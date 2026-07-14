export declare function fileExists(filePath: string): Promise<boolean>;
export declare function readJson<T>(filePath: string): Promise<T>;
export declare function writeJson(filePath: string, data: unknown): Promise<void>;
export declare function mkdirp(dirPath: string): Promise<void>;
