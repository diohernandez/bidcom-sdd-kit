import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { Command } from "commander";
import { registerInitCommand } from "./commands/init.js";
import { registerPlanCommand } from "./commands/plan.js";
import { registerBuildCommand } from "./commands/build.js";
import { registerValidateCommand } from "./commands/validate.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerReverseCommand } from "./commands/reverse.js";
import { registerMcpServerCommand } from "./commands/mcpServer.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function readVersion(): string {
  const packageJsonPath = path.resolve(moduleDir, "../../package.json");
  const pkg = fs.readJsonSync(packageJsonPath) as { version: string };
  return pkg.version;
}

export function createProgram(): Command {
  const program = new Command();
  program
    .name("sdd")
    .description("Spec-Driven Development Toolkit - CLI para Claude/OpenCode")
    .version(readVersion())
    .exitOverride()
    .configureOutput({
      writeErr: (message) => process.stderr.write(message),
    });

  registerInitCommand(program);
  registerPlanCommand(program);
  registerBuildCommand(program);
  registerValidateCommand(program);
  registerStatusCommand(program);
  registerReverseCommand(program);
  registerMcpServerCommand(program);

  return program;
}
