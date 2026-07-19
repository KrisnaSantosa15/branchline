#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, cp, mkdir, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = join(packageRoot, "integrations", "skills");

const HARNESS_ALIASES = new Map([
  ["codex", "codex"],
  ["claude", "claude-code"],
  ["claude-code", "claude-code"],
  ["cursor", "cursor"],
  ["github-copilot", "github-copilot"],
  ["copilot", "github-copilot"],
  ["opencode", "opencode"],
  ["gemini", "gemini"],
  ["gemini-cli", "gemini"],
]);

const HARNESS_TARGETS = {
  codex: ".agents/skills",
  "claude-code": ".claude/skills",
  cursor: ".cursor/skills",
  "github-copilot": ".github/skills",
  opencode: ".opencode/skills",
  gemini: ".gemini/skills",
};

function usage() {
  return `Branchline — evidence-led release rehearsal

Usage:
  branchline init <harness|all> [--cwd <project-path>] [--force]
  branchline analyze <local-git-path-or-public-https-url> [base-commit] [head-commit]
  branchline council <local-git-path-or-public-https-url> [base-commit] [head-commit] [--format json|markdown]
  branchline validate-report <evidence-pack.json> <report.json> [...report.json] [--format json|markdown]
  branchline doctor

Harnesses: codex, claude-code, cursor, github-copilot, opencode, gemini, all

Commands are local and read-only. Branchline reads committed Git metadata and
files; it never executes target repository code, deploys, creates pull requests,
or sends evidence to a model provider.`;
}

function parseOptions(argumentsList) {
  const positional = [];
  let cwd = process.cwd();
  let force = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--cwd") {
      const next = argumentsList[index + 1];
      if (!next) throw new Error("Missing project path after --cwd.");
      cwd = resolve(next);
      index += 1;
      continue;
    }
    if (argument === "--force") {
      force = true;
      continue;
    }
    positional.push(argument);
  }

  return { positional, cwd, force };
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function copySkill(templateName, targetDirectory, force) {
  const source = join(templateRoot, templateName);
  if (!force && await pathExists(targetDirectory)) {
    return { action: "skipped", path: targetDirectory };
  }

  if (force && await pathExists(targetDirectory)) {
    await rm(targetDirectory, { recursive: true, force: true });
  }

  await mkdir(dirname(targetDirectory), { recursive: true });
  await cp(source, targetDirectory, { recursive: true });
  return { action: "installed", path: targetDirectory };
}

async function installSkills(harnessInput, options) {
  const normalized = harnessInput === "all" ? "all" : HARNESS_ALIASES.get(harnessInput);
  if (!normalized) {
    throw new Error(`Unknown harness: ${harnessInput}.\n\n${usage()}`);
  }

  const harnesses = normalized === "all" ? Object.keys(HARNESS_TARGETS) : [normalized];
  const projectStat = await stat(options.cwd).catch(() => undefined);
  if (!projectStat?.isDirectory()) {
    throw new Error(`The project directory does not exist: ${options.cwd}`);
  }

  const results = [];
  for (const harness of harnesses) {
    const root = join(options.cwd, HARNESS_TARGETS[harness]);
    for (const skillName of ["branchline", "branchline-cli", "branchline-council", "branchline-review"]) {
      results.push({
        harness,
        skillName,
        ...(await copySkill(skillName, join(root, skillName), options.force)),
      });
    }
  }

  for (const result of results) {
    const prefix = result.action === "installed" ? "installed" : "skipped (exists)";
    console.log(`${prefix}: ${relative(options.cwd, result.path) || result.path} [${result.harness}]`);
  }

  const installed = results.filter((result) => result.action === "installed").length;
  const skipped = results.length - installed;
  console.log(`\nBranchline adapters ready: ${installed} installed, ${skipped} skipped.`);
  if (skipped > 0) console.log("Use --force only when you intend to replace an existing adapter.");
}

function run(command, argumentsList) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, argumentsList, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`${command} stopped by ${signal}.`));
      else resolvePromise(code ?? 1);
    });
  });
}

async function analyze(argumentsList) {
  const tsxCli = require.resolve("tsx/cli");
  const analyzer = join(packageRoot, "scripts", "branchline.ts");
  const tsconfig = join(packageRoot, "tsconfig.json");
  const exitCode = await run(process.execPath, [tsxCli, "--tsconfig", tsconfig, analyzer, ...argumentsList]);
  process.exitCode = exitCode;
}

async function council(argumentsList) {
  const tsxCli = require.resolve("tsx/cli");
  const councilScript = join(packageRoot, "scripts", "council.ts");
  const tsconfig = join(packageRoot, "tsconfig.json");
  const exitCode = await run(process.execPath, [tsxCli, "--tsconfig", tsconfig, councilScript, ...argumentsList]);
  process.exitCode = exitCode;
}

async function validateReport(argumentsList) {
  const tsxCli = require.resolve("tsx/cli");
  const validator = join(packageRoot, "scripts", "validate-council-report.ts");
  const tsconfig = join(packageRoot, "tsconfig.json");
  const exitCode = await run(process.execPath, [tsxCli, "--tsconfig", tsconfig, validator, ...argumentsList]);
  process.exitCode = exitCode;
}

async function doctor() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  console.log(`Node.js ${process.versions.node} ${nodeMajor >= 20 ? "✓" : "✗ requires Node 20+"}`);
  const gitExitCode = await run("git", ["--version"]);
  if (gitExitCode !== 0) process.exitCode = 1;
  console.log("Branchline makes no network or model-provider call during analysis.");
}

async function main() {
  const [command = "help", ...argumentsList] = process.argv.slice(2);
  if (["help", "--help", "-h"].includes(command)) {
    console.log(usage());
    return;
  }
  if (["--version", "-v", "version"].includes(command)) {
    const pkg = require(join(packageRoot, "package.json"));
    console.log(pkg.version);
    return;
  }
  if (command === "init") {
    const { positional, ...options } = parseOptions(argumentsList);
    if (!positional[0]) throw new Error(`Missing harness.\n\n${usage()}`);
    await installSkills(positional[0], options);
    return;
  }
  if (command === "analyze") {
    await analyze(argumentsList);
    return;
  }
  if (command === "council") {
    await council(argumentsList);
    return;
  }
  if (command === "validate-report") {
    await validateReport(argumentsList);
    return;
  }
  if (command === "doctor") {
    await doctor();
    return;
  }
  throw new Error(`Unknown command: ${command}.\n\n${usage()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Branchline failed.");
  process.exitCode = 1;
});
