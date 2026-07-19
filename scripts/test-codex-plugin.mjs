import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = join(projectRoot, "plugins", "branchline");
const packageManifest = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
const plugin = JSON.parse(await readFile(join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"));
const marketplace = JSON.parse(await readFile(join(projectRoot, ".agents", "plugins", "marketplace.json"), "utf8"));

assert.equal(plugin.name, "branchline");
assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
assert.equal(plugin.version, packageManifest.version);
assert.equal(plugin.skills, "./skills/");
assert.equal(plugin.interface.displayName, "Branchline");
assert.ok(plugin.interface.capabilities.includes("skills"));
assert.match(plugin.interface.defaultPrompt, /release candidate/i);

const marketplaceEntry = marketplace.plugins.find((entry) => entry.name === "branchline");
assert.ok(marketplaceEntry, "Marketplace must expose the Branchline plugin.");
assert.deepEqual(marketplaceEntry.source, { source: "local", path: "./plugins/branchline" });

for (const name of ["branchline", "branchline-cli", "branchline-council", "branchline-review"]) {
  const skillPath = join(pluginRoot, "skills", name, "SKILL.md");
  const skill = await readFile(skillPath, "utf8");
  await stat(skillPath);
  assert.match(skill, /^---\r?\nname: [\w-]+\r?\ndescription: .+\r?\n---\r?\n/s);
  assert.match(skill, /npx github:KrisnaSantosa15\/branchline/);
}

console.log("Codex plugin structure checks passed.");
