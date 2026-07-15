#!/usr/bin/env node
import { createProgram } from "../dist/cli/createProgram.js";

const program = createProgram();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error && typeof error.exitCode === "number") {
    process.exit(error.exitCode);
  }
  console.error(error);
  process.exit(1);
}
