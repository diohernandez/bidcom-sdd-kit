import path from 'node:path';
import fs from 'fs-extra';
import { fileExists } from '../../../utils/fs.js';
import { parseFrontmatter } from '../../../utils/frontmatter.js';
function phaseGuidance(featureName, phase) {
    if (phase === 'tasks') {
        return `El feature está en estado "tasks". Necesitás aprobar el plan primero: sdd approve ${featureName}`;
    }
    if (phase === 'funcional' || phase === 'tecnico') {
        return `El feature aún no tiene las tareas definidas (fase actual: "${phase}"). Continuá la planificación antes de implementar.`;
    }
    return `El feature no está listo para implementación (fase actual: "${phase}"). Ejecutá: sdd plan ${featureName}`;
}
export class BuildWorkflow {
    async execute(options) {
        const { featureName, projectPath, config } = options;
        const featurePath = path.join(projectPath, config.wipPath, featureName);
        const metaPath = path.join(featurePath, 'meta.md');
        if (!(await fileExists(metaPath))) {
            return { success: false, error: `El feature "${featureName}" no existe (falta ${metaPath})` };
        }
        const meta = await fs.readFile(metaPath, 'utf-8');
        const { data } = parseFrontmatter(meta);
        const phase = typeof data.state === 'string' ? data.state : undefined;
        if (phase !== 'impl') {
            return { success: false, phase, error: phaseGuidance(featureName, phase) };
        }
        return {
            success: true,
            phase,
            nextSteps: [
                'Implementar siguiendo TDD: código fuente, tests unitarios, Storybook stories',
                `Ejecutar: sdd validate ${featureName}`,
            ],
        };
    }
}
//# sourceMappingURL=BuildWorkflow.js.map