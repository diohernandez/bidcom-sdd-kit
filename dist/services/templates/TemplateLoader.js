import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { fileExists } from '../../utils/fs.js';
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TEMPLATES_ROOT = path.resolve(moduleDir, '../../../templates');
const DEV_WORKFLOW_TEMPLATE_FILES = {
    constitution: 'constitution',
    functionalSpec: 'functional-spec',
    technicalSpec: 'technical-spec',
    taskList: 'task-list',
    meta: 'meta',
};
export class TemplateLoader {
    templatesRoot;
    constructor(templatesRoot = DEFAULT_TEMPLATES_ROOT) {
        this.templatesRoot = templatesRoot;
    }
    async load(stackFolder, templateName) {
        const primaryPath = path.join(this.templatesRoot, stackFolder, `${templateName}.md`);
        if (await fileExists(primaryPath)) {
            return { name: templateName, content: await fs.readFile(primaryPath, 'utf-8') };
        }
        if (stackFolder !== 'generic') {
            const fallbackPath = path.join(this.templatesRoot, 'generic', `${templateName}.md`);
            if (await fileExists(fallbackPath)) {
                return { name: templateName, content: await fs.readFile(fallbackPath, 'utf-8') };
            }
        }
        throw new Error(`Template "${templateName}" not found for stack "${stackFolder}" (no generic fallback either)`);
    }
    async loadForStack(stack) {
        const stackFolder = this.resolveStackFolder(stack.language);
        const entries = await Promise.all(Object.entries(DEV_WORKFLOW_TEMPLATE_FILES).map(async ([key, fileName]) => [key, await this.load(stackFolder, fileName)]));
        return Object.fromEntries(entries);
    }
    resolveStackFolder(language) {
        if (language === 'typescript')
            return 'typescript';
        if (language === 'python')
            return 'python';
        return 'generic';
    }
}
//# sourceMappingURL=TemplateLoader.js.map