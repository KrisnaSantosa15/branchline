import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = join(projectRoot, "plugins", "claude-code", "branchline");
const packageManifest = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
const plugin = JSON.parse(await readFile(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
const marketplace = JSON.parse(await readFile(join(projectRoot, ".claude-plugin", "marketplace.json"), "utf8"));

assert.equal(marketplace.name, "branchline-tools");
assert.equal(marketplace.owner.name, "Krisna Santosa");
const marketplaceEntry = marketplace.plugins.find((entry) => entry.name === "branchline");
assert.ok(marketplaceEntry, "Marketplace must expose the Branchline plugin.");
assert.equal(marketplaceEntry.source, "./plugins/claude-code/branchline");
assert.equal(marketplaceEntry.version, plugin.version);

assert.equal(plugin.name, "branchline");
assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
assert.equal(plugin.version, packageManifest.version);
assert.equal(plugin.skills, "./skills");
assert.equal(plugin.license, "MIT");

for (const name of ["branchline", "branchline-cli", "branchline-council", "branchline-review"]) {
  const skillPath = join(pluginRoot, "skills", name, "SKILL.md");
  const skill = await readFile(skillPath, "utf8");
  await stat(skillPath);
  assert.match(skill, /^---\r?\nname: [\w-]+\r?\ndescription: .+\r?\n---\r?\n/s);
  assert.match(skill, /npx github:KrisnaSantosa15\/branchline/);
}

console.log("Claude Code plugin structure checks passed.");
