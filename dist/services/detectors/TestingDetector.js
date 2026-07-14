import { readNodeDependencies, readPythonManifestBlob } from './manifest.js';
import { stripSemverRange } from '../../utils/semver.js';
function manifestMentions(blob, packageName) {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9_-])${escaped}([^a-z0-9_-]|$)`, 'i').test(blob);
}
export class TestingDetector {
    async detect(projectPath, language) {
        if (language === 'typescript')
            return this.detectTypeScriptTesting(projectPath);
        if (language === 'python')
            return this.detectPythonTesting(projectPath);
        return {};
    }
    async detectTypeScriptTesting(projectPath) {
        const deps = await readNodeDependencies(projectPath);
        if (!deps)
            return {};
        const unit = [];
        if (deps.jest)
            unit.push(`Jest ${stripSemverRange(deps.jest)}`);
        if (deps.vitest)
            unit.push(`Vitest ${stripSemverRange(deps.vitest)}`);
        const e2e = [];
        if (deps.cypress)
            e2e.push(`Cypress ${stripSemverRange(deps.cypress)}`);
        if (deps.playwright)
            e2e.push(`Playwright ${stripSemverRange(deps.playwright)}`);
        const visual = [];
        if (deps.storybook)
            visual.push(`Storybook ${stripSemverRange(deps.storybook)}`);
        const testing = {};
        if (unit.length > 0)
            testing.unit = unit;
        if (e2e.length > 0)
            testing.e2e = e2e;
        if (visual.length > 0)
            testing.visual = visual;
        return testing;
    }
    async detectPythonTesting(projectPath) {
        const blob = await readPythonManifestBlob(projectPath);
        if (!blob)
            return {};
        const testing = {};
        if (manifestMentions(blob, 'pytest'))
            testing.unit = ['pytest'];
        return testing;
    }
}
//# sourceMappingURL=TestingDetector.js.map