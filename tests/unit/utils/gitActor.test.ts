import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import fs from "fs-extra";
import { getGitActor } from "../../../src/utils/gitActor.js";

function isolatedEnv(tempDir: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: tempDir,
    GIT_CONFIG_GLOBAL: path.join(tempDir, "nonexistent-gitconfig"),
    GIT_CONFIG_SYSTEM: path.join(tempDir, "nonexistent-system-gitconfig"),
  };
}

describe("utils/gitActor", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sdd-kit-git-actor-"));
    execFileSync("git", ["init"], { cwd: tempDir, env: isolatedEnv(tempDir) });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("uses git config user.name and user.email when both are set", () => {
    const env = isolatedEnv(tempDir);
    execFileSync("git", ["config", "user.name", "Ada Lovelace"], {
      cwd: tempDir,
      env,
    });
    execFileSync("git", ["config", "user.email", "ada@example.com"], {
      cwd: tempDir,
      env,
    });

    const actualActor = getGitActor({ cwd: tempDir, env });

    expect(actualActor).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("falls back name to user.email when user.name is not configured", () => {
    const env = isolatedEnv(tempDir);
    execFileSync("git", ["config", "user.email", "ada@example.com"], {
      cwd: tempDir,
      env,
    });

    const actualActor = getGitActor({ cwd: tempDir, env });

    expect(actualActor).toEqual({
      name: "ada@example.com",
      email: "ada@example.com",
    });
  });

  it('falls back name to whoami@hostname and email to "unknown" when nothing is configured', () => {
    const env = isolatedEnv(tempDir);

    const actualActor = getGitActor({ cwd: tempDir, env });

    expect(actualActor.name).toMatch(/^.+@.+$/);
    expect(actualActor.email).toBe("unknown");
  });
});
