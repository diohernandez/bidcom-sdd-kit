import chalk from "chalk";

export function printBanner(title: string): void {
  const width = title.length + 4;
  const top = `╔${"═".repeat(width)}╗`;
  const bottom = `╚${"═".repeat(width)}╝`;
  console.log("");
  console.log(chalk.cyan(top));
  console.log(chalk.cyan(`║  ${title}  ║`));
  console.log(chalk.cyan(bottom));
  console.log("");
}

export function printError(message: string): void {
  console.error(chalk.red(`❌ ${message}`));
}

export function printSuccess(message: string): void {
  console.log(chalk.green(`✅ ${message}`));
}

export function printNextSteps(steps?: string[]): void {
  if (!steps || steps.length === 0) return;
  console.log("");
  console.log("Próximos pasos:");
  for (const step of steps) {
    console.log(`  • ${step}`);
  }
}
