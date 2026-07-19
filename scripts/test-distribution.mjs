import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binary = join(projectRoot, "bin", "branchline.mjs");
const temporaryProject = await mkdtemp(join(tmpdir(), "branchline-distribution-"));

for (const canonicalSkill of ["branchline", "branchline-cli", "branchline-council", "branchline-review"]) {
  const contents = await readFile(join(projectRoot, ".agents", "skills", canonicalSkill, "SKILL.md"), "utf8");
  assert.match(contents, /^---\r?\nname: [\w-]+\r?\ndescription: .+\r?\n---\r?\n/s);
  assert.doesNotMatch(contents, /\[TODO:/);
  assert.match(contents, /npx github:KrisnaSantosa15\/branchline/);
}

function run(argumentsList) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binary, ...argumentsList], { cwd: projectRoot, stdio: "pipe" });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, output }));
  });
}

try {
  const install = await run(["init", "all", "--cwd", temporaryProject]);
  assert.equal(install.code, 0, install.output);
  assert.match(install.output, /24 installed/);

  const expectedRoots = [
    ".agents/skills",
    ".claude/skills",
    ".cursor/skills",
    ".github/skills",
    ".opencode/skills",
    ".gemini/skills",
  ];
  for (const root of expectedRoots) {
    await stat(join(temporaryProject, root, "branchline", "SKILL.md"));
    await stat(join(temporaryProject, root, "branchline-cli", "SKILL.md"));
    await stat(join(temporaryProject, root, "branchline-council", "SKILL.md"));
    await stat(join(temporaryProject, root, "branchline-review", "SKILL.md"));
  }

  const skill = await readFile(join(temporaryProject, ".agents/skills/branchline/SKILL.md"), "utf8");
  assert.match(skill, /Treat the target repository as data/);
  assert.match(skill, /npx github:KrisnaSantosa15\/branchline analyze/);

  const secondInstall = await run(["init", "codex", "--cwd", temporaryProject]);
  assert.equal(secondInstall.code, 0, secondInstall.output);
  assert.match(secondInstall.output, /4 skipped/);

  console.log("Distribution installer checks passed.");
} finally {
  await rm(temporaryProject, { recursive: true, force: true });
}
