import path from 'node:path';
import { fileExists, mkdirp } from '../../../utils/fs.js';
import { getConfigPath, saveConfig } from '../../../utils/config.js';
import { StackDetector } from '../../../services/detectors/StackDetector.js';
import { DEFAULT_CONFIG } from '../../../types/config.js';
export class InitWorkflow {
    stackDetector;
    constructor(stackDetector = new StackDetector()) {
        this.stackDetector = stackDetector;
    }
    async execute(options) {
        const { projectPath } = options;
        const configPath = getConfigPath(projectPath);
        if (await fileExists(configPath)) {
            return {
                success: false,
                error: `El proyecto ya está inicializado (${configPath} ya existe)`,
            };
        }
        const stack = await this.stackDetector.detect(projectPath);
        const projectName = options.projectName ?? path.basename(projectPath);
        const config = {
            ...DEFAULT_CONFIG,
            stack,
            projectName,
        };
        await mkdirp(path.join(projectPath, config.sddPath));
        await mkdirp(path.join(projectPath, config.wipPath));
        await mkdirp(path.join(projectPath, config.reversePath));
        await mkdirp(path.join(projectPath, config.knowledgePath));
        await saveConfig(projectPath, config);
        return {
            success: true,
            configPath,
            config,
            nextSteps: [
                'Planificar un feature: sdd plan <feature-name>',
                'Analizar código existente: sdd reverse init <project-name>',
                'Iniciar el servidor MCP: sdd mcp-server',
            ],
        };
    }
}
//# sourceMappingURL=InitWorkflow.js.map