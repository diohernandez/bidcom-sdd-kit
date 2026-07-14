import path from 'node:path';
import fs from 'fs-extra';
import { fileExists } from '../../../utils/fs.js';
import { parseFrontmatter } from '../../../utils/frontmatter.js';
function hasHeading(content, heading) {
    return content.split('\n').some((line) => line.trim() === heading);
}
function extractSection(content, heading) {
    const lines = content.split('\n');
    const startIndex = lines.findIndex((line) => line.trim() === heading);
    if (startIndex === -1)
        return null;
    const rest = lines.slice(startIndex + 1);
    const nextHeadingIndex = rest.findIndex((line) => /^#{1,6}\s/.test(line.trim()));
    const sectionLines = nextHeadingIndex === -1 ? rest : rest.slice(0, nextHeadingIndex);
    return sectionLines.join('\n');
}
function checkSection(content, heading, placeholder) {
    if (!hasHeading(content, heading)) {
        return { name: `section:${heading}`, passed: false, detail: `Falta la sección "${heading}"` };
    }
    if (placeholder) {
        const section = extractSection(content, placeholder.withinHeading);
        if (section !== null && section.includes(placeholder.substring)) {
            return {
                name: `section:${heading}`,
                passed: false,
                detail: `La sección "${placeholder.withinHeading}" todavía tiene texto de placeholder`,
            };
        }
    }
    return { name: `section:${heading}`, passed: true };
}
function validateFunctionalSpec(content) {
    return [
        checkSection(content, '## 1. Descripción del Problema', {
            withinHeading: '## 1. Descripción del Problema',
            substring: '_¿Qué problema',
        }),
        checkSection(content, '## 2. Objetivos', {
            withinHeading: '## 2. Objetivos',
            substring: '- [ ] Objetivo 1',
        }),
        checkSection(content, '## 3. Requisitos Funcionales'),
        checkSection(content, '### 3.1 Historias de Usuario', {
            withinHeading: '### 3.1 Historias de Usuario',
            substring: '**Como** [rol]',
        }),
        checkSection(content, '### 3.2 Criterios de Aceptación'),
        checkSection(content, '## 4. Casos de Uso'),
    ];
}
function validateTechnicalSpec(content) {
    return [
        checkSection(content, '## 1. Arquitectura y Patrones de Diseño', {
            withinHeading: '### 1.1 Patrón Principal',
            substring: '_¿Container',
        }),
        checkSection(content, '## 2. Estructura de Archivos'),
        checkSection(content, '## 3. Interfaces y Tipos'),
        checkSection(content, '## 4. Gestión de Estado'),
        checkSection(content, '## 5. Estrategia de Testing'),
    ];
}
export class ValidateWorkflow {
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
        if (phase === 'funcional') {
            const specPath = path.join(featurePath, '1-functional', 'spec.md');
            if (!(await fileExists(specPath))) {
                return {
                    success: false,
                    phase,
                    error: `No existe la especificación funcional (${specPath})`,
                };
            }
            const specContent = await fs.readFile(specPath, 'utf-8');
            const checks = validateFunctionalSpec(specContent);
            return { success: checks.every((check) => check.passed), phase, checks };
        }
        if (phase === 'tecnico') {
            const specPath = path.join(featurePath, '2-technical', 'spec.md');
            if (!(await fileExists(specPath))) {
                return { success: false, phase, error: `No existe la especificación técnica (${specPath})` };
            }
            const specContent = await fs.readFile(specPath, 'utf-8');
            const checks = validateTechnicalSpec(specContent);
            return { success: checks.every((check) => check.passed), phase, checks };
        }
        return {
            success: false,
            phase,
            error: `La fase actual ("${phase}") no tiene validación de contenido definida en ValidateWorkflow`,
        };
    }
}
//# sourceMappingURL=ValidateWorkflow.js.map