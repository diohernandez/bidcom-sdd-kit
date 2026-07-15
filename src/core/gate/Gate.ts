import { runStructuralChecks } from "./checks/structural.js";
import { runBuildCheck } from "./checks/build.js";
import { runTestsCheck } from "./checks/tests.js";
import { runMutationCheck } from "./checks/mutation.js";
import { writeGateResult } from "./GateResult.js";
import type {
  ExitCode,
  GateCheck,
  GateResult,
  GateRunOptions,
} from "./types.js";

function computeExitCode(
  structuralPassed: boolean,
  buildPassed: boolean,
  testsPassed: boolean,
  mutationPassed: boolean,
): ExitCode {
  if (!structuralPassed) return 1 as ExitCode;
  if (!buildPassed) return 2 as ExitCode;
  if (!testsPassed) return 3 as ExitCode;
  if (!mutationPassed) return 4 as ExitCode;
  return 0 as ExitCode;
}

export class Gate {
  constructor(
    private readonly structuralRunner = runStructuralChecks,
    private readonly buildRunner = runBuildCheck,
    private readonly testsRunner = runTestsCheck,
    private readonly mutationRunner = runMutationCheck,
  ) {}

  async run(options: GateRunOptions): Promise<GateResult> {
    const { context, config, writeResult = true } = options;

    const structuralChecks = await this.structuralRunner(context);
    const structuralPassed = structuralChecks.every((check) => check.passed);

    const checks: GateCheck[] = [...structuralChecks];
    let buildPassed = true;
    let testsPassed = true;
    let mutationPassed = true;

    if (context.phase === "impl") {
      const buildCheck = await this.buildRunner(context);
      checks.push(buildCheck);
      buildPassed = buildCheck.passed;

      if (buildPassed) {
        const testsCheck = await this.testsRunner(context);
        checks.push(testsCheck);
        testsPassed = testsCheck.passed;

        if (testsPassed) {
          const mutationCheck = await this.mutationRunner(context, config);
          checks.push(mutationCheck);
          mutationPassed = mutationCheck.passed;
        }
      }
    }

    const exitCode = computeExitCode(
      structuralPassed,
      buildPassed,
      testsPassed,
      mutationPassed,
    );

    const result: GateResult = {
      gate: context.phase,
      passed: exitCode === 0,
      exit_code: exitCode,
      checks,
    };

    if (writeResult) {
      await writeGateResult(context.featurePath, result);
    }

    return result;
  }
}
