import { describe, it, expect } from "@jest/globals";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

describe("drivers", () => {
  const driverFiles = ["ralph-loop.md", "gsd-style.md", "gstack-style.md"];

  it.each(driverFiles)("%s exists and has content", async (fileName) => {
    const filePath = path.join(repoRoot, "drivers", fileName);
    const content = await fs.readFile(filePath, "utf-8");
    expect(content.length).toBeGreaterThan(100);
    expect(content).toContain("## Propósito");
  });
});
