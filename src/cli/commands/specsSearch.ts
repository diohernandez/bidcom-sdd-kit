import type { Command } from "commander";
import { searchSpecs } from "../../core/specs/search.js";
import { requireConfig } from "../context.js";
import { printBanner } from "../ui.js";

export function registerSpecsSearchCommand(program: Command): void {
  program
    .command("specs-search <query>")
    .description("Busca sobre specs/ por texto o tag")
    .action(async (query: string) => {
      printBanner("🔍 SDD KIT - Specs Search");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const results = await searchSpecs({
        projectPath,
        specsPath: config.specsPath,
        query,
      });

      if (results.length === 0) {
        console.log("No se encontraron capabilities.");
        return;
      }

      for (const result of results) {
        console.log(`  • ${result.capability}: ${result.title}`);
        if (result.matches.length > 0) {
          for (const match of result.matches.slice(0, 3)) {
            console.log(`    - ${match}`);
          }
        }
      }
    });
}
