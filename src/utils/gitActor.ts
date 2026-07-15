import { execFileSync } from "node:child_process";
import os from "node:os";

export interface GitActor {
  name: string;
  email: string;
}

export interface GetGitActorOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

function readGitConfig(
  key: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
  try {
    const value = execFileSync("git", ["config", key], {
      cwd,
      env,
      encoding: "utf-8",
    }).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

function whoamiAtHostname(): string {
  const username = os.userInfo().username;
  const hostname = os.hostname().split(".")[0];
  return `${username}@${hostname}`;
}

export function getGitActor(options: GetGitActorOptions = {}): GitActor {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;

  const configuredName = readGitConfig("user.name", cwd, env);
  const configuredEmail = readGitConfig("user.email", cwd, env);

  const name = configuredName ?? configuredEmail ?? whoamiAtHostname();
  const email = configuredEmail ?? "unknown";

  return { name, email };
}
