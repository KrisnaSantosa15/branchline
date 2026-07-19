import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export type FixtureCommits = { repositoryPath: string; baseCommit: string; headCommit: string };

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const fixturePath = resolve(scriptDirectory, "..", "fixtures", "release-fixture");

function write(relativePath: string, content: string) {
  const target = join(fixturePath, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function git(args: string[]) {
  execFileSync("git", args, { cwd: fixturePath, stdio: "pipe" });
}

function gitOutput(args: string[]) {
  return execFileSync("git", args, { cwd: fixturePath, encoding: "utf8" }).trim();
}

export function resetFixture(): FixtureCommits {
  if (existsSync(fixturePath)) rmSync(fixturePath, { recursive: true, force: true });
  mkdirSync(fixturePath, { recursive: true });
  write(
    "package.json",
    JSON.stringify({ name: "branchline-release-fixture", private: true, type: "module", scripts: { test: "node --test" } }, null, 2) + "\n",
  );
  write(
    "src/api/release-risk.ts",
    `export type ReleaseRiskResponse = {
  repository: string;
  riskLevel?: "low" | "high";
};

export function getReleaseRisk(): ReleaseRiskResponse {
  return { repository: "catalog-api" };
}
`,
  );
  write(
    "src/client/legacy-client.ts",
    `import type { ReleaseRiskResponse } from "../api/release-risk";

export function renderLegacyRisk(response: ReleaseRiskResponse) {
  return response.riskLevel ?? "unknown";
}
`,
  );
  write(
    "src/api/release-risk.test.ts",
    `import assert from "node:assert/strict";
import test from "node:test";
import { getReleaseRisk } from "./release-risk";

test("release-risk preserves a readable legacy response", () => {
  assert.equal(getReleaseRisk().repository, "catalog-api");
});
`,
  );
  write("README.md", "# Branchline release fixture\n\nA deliberately small contract change used to verify Branchline end to end.\n");
  git(["init"]);
  git(["config", "user.email", "fixture@branchline.local"]);
  git(["config", "user.name", "Branchline Fixture"]);
  git(["add", "."]);
  git(["commit", "-m", "baseline: optional release risk contract"]);
  const baseCommit = gitOutput(["rev-parse", "HEAD"]);

  write(
    "src/api/release-risk.ts",
    `export type ReleaseRiskResponse = {
  repository: string;
  riskLevel: "low" | "high";
};

export function getReleaseRisk(): ReleaseRiskResponse {
  return { repository: "catalog-api", riskLevel: "low" };
}
`,
  );
  write("CHANGELOG.md", "# Candidate change\n\n`riskLevel` is now required for the release-risk response.\n");
  git(["add", "."]);
  git(["commit", "-m", "feat: require release risk level"]);
  const headCommit = gitOutput(["rev-parse", "HEAD"]);
  return { repositoryPath: fixturePath, baseCommit, headCommit };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fixture = resetFixture();
  console.log(`Fixture ready: ${fixture.repositoryPath}`);
  console.log(`Base: ${fixture.baseCommit}`);
  console.log(`Head: ${fixture.headCommit}`);
}
