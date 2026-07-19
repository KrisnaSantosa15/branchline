import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = join(projectRoot, "fixtures", "release-fixture");
const child = spawn(process.execPath, [join(projectRoot, "bin", "branchline.mjs"), "mcp"], {
  cwd: projectRoot,
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => { stdout += chunk; });
child.stderr.on("data", (chunk) => { stderr += chunk; });

const requests = [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "branchline-test", version: "1.0.0" } } },
  { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
  { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  { jsonrpc: "2.0", id: 3, method: "resources/read", params: { uri: "branchline://guide/release-safety" } },
  { jsonrpc: "2.0", id: 4, method: "prompts/get", params: { name: "release_council", arguments: { repository: fixture } } },
  { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "get_evidence_pack", arguments: { repository: fixture } } },
];
child.stdin.end(`${requests.map((request) => JSON.stringify(request)).join("\n")}\n`);

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", resolve);
});

assert.equal(exitCode, 0, stderr || "MCP process exited unsuccessfully.");
const responses = stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const response = (id) => responses.find((message) => message.id === id);

assert.equal(response(1).result.serverInfo.name, "branchline");
assert.equal(response(1).result.protocolVersion, "2025-11-25");
assert.deepEqual(response(2).result.tools.map((tool) => tool.name), ["analyze_release", "get_evidence_pack", "compare_rollouts", "check_policy"]);
assert.match(response(3).result.contents[0].text, /never execute target code/i);
assert.match(response(4).result.messages[0].content.text, /get_evidence_pack/);
assert.match(response(5).result.structuredContent.hash, /^[a-f0-9]{64}$/);
assert.equal(response(5).result.structuredContent.evidence.length > 0, true);

console.log("MCP protocol and evidence-pack smoke test passed.");
