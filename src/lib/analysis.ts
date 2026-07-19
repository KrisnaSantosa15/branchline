import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import type { SimpleGit } from "simple-git";
import type { AnalysisResult, Confidence, Evidence, Finding, FindingKind, GraphEdge, GraphNode } from "@/lib/domain";
import { fileAtCommit, gitFor, trackedFiles } from "@/lib/repository";

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^\s"']{8,}/gi,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g,
];

const TEST_FILE = /(?:^|\.|\/)(?:test|spec)\.[cm]?[jt]sx?$|__tests__\//i;
const SOURCE_FILE = /\.[cm]?[jt]sx?$/i;

function stableId(...parts: string[]) {
  return createHash("sha1").update(parts.join("::")).digest("hex").slice(0, 14);
}

function redact(text: string) {
  let redacted = text;
  const warnings: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      warnings.push(`Potential secret redacted: ${match[0].slice(0, 16)}…`);
    }
    redacted = redacted.replace(pattern, "[REDACTED_SECRET]");
  }
  return { redacted, warnings: [...new Set(warnings)] };
}

function evidence(pathname: string, label: string, detail: string, lineHint?: string): Evidence {
  return { id: stableId(pathname, label, detail), path: pathname, label, detail, lineHint };
}

function severityFor(kind: FindingKind): Finding["severity"] {
  if (kind === "api-contract-tightened") return "critical";
  if (kind === "migration-changed" || kind === "dependency-changed") return "high";
  if (kind === "route-changed" || kind === "export-changed") return "medium";
  return "low";
}

function confidenceFor(kind: FindingKind): Confidence {
  return kind === "api-contract-tightened" || kind === "test-changed" || kind === "dependency-changed" ? "high" : "medium";
}

function changeKind(pathname: string, patch: string): FindingKind {
  if (/package(?:-lock)?\.json$|pnpm-lock\.yaml$|yarn\.lock$/i.test(pathname)) return "dependency-changed";
  if (/\.(?:env|ini|toml|ya?ml)$/i.test(pathname) || /(?:config|settings)/i.test(pathname)) return "configuration-changed";
  if (/(?:migration|migrations)\//i.test(pathname)) return "migration-changed";
  if (TEST_FILE.test(pathname)) return "test-changed";
  if (/\bexport\s+(?:type|interface|class|function|const)\b/.test(patch)) return "export-changed";
  if (/(?:route|controller|handler|api)\b/i.test(pathname) || /\b(?:GET|POST|PUT|PATCH|DELETE)\s*\(/.test(patch)) return "route-changed";
  return "file-changed";
}

function contractTightening(pathname: string, patch: string): Finding | undefined {
  const removedOptional = [...patch.matchAll(/^-\s*([A-Za-z_$][\w$]*)\?\s*:/gm)].map((match) => match[1]);
  const addedRequired = new Set([...patch.matchAll(/^\+\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((match) => match[1]));
  const property = removedOptional.find((name) => addedRequired.has(name));
  if (!property) return undefined;
  const itemEvidence = evidence(pathname, "optional property became required", `${property}? changed to ${property}`, property);
  return {
    id: stableId(pathname, "api-contract-tightened", property),
    kind: "api-contract-tightened",
    title: `${property} is now required`,
    detail: "A previously optional response/property field became required. Consumers compiled against the older contract can fail or need a compatibility window.",
    confidence: "high",
    severity: "critical",
    evidence: [itemEvidence],
    impactedFiles: [pathname],
    metadata: { property },
  };
}

async function changedPatch(git: SimpleGit, base: string, head: string, pathname: string) {
  return git.diff([base, head, "--", pathname]);
}

async function directConsumers(git: SimpleGit, head: string, changedFile: string, tokens: string[]) {
  const files = (await trackedFiles(git, head)).filter((file) => SOURCE_FILE.test(file)).slice(0, 300);
  const basename = path.basename(changedFile).replace(/\.[^.]+$/, "");
  const results: string[] = [];
  for (const file of files) {
    if (file === changedFile) continue;
    try {
      const content = await fileAtCommit(git, head, file);
      const importsChangedModule = content.includes(basename) && /\bfrom\s+["']/.test(content);
      const refersToContract = tokens.some((token) => content.includes(token));
      if (importsChangedModule || refersToContract) results.push(file);
    } catch {
      // A binary or deleted file cannot be a direct source consumer.
    }
  }
  return results.slice(0, 12);
}

export async function analyzeRepository(input: { workspaceId: string; repositoryPath: string; baseCommit: string; headCommit: string }): Promise<AnalysisResult> {
  const git = gitFor(input.repositoryPath);
  const summary = await git.diffSummary([input.baseCommit, input.headCommit]);
  if (!summary.files.length) throw new Error("The selected commits have no file differences to rehearse.");

  const findings: Finding[] = [];
  const graphNodes: GraphNode[] = [];
  const graphEdges: GraphEdge[] = [];
  const secretWarnings: string[] = [];

  for (const file of summary.files) {
    const pathname = file.file;
    const patch = await changedPatch(git, input.baseCommit, input.headCommit, pathname);
    const safePatch = redact(patch);
    secretWarnings.push(...safePatch.warnings);
    const contract = contractTightening(pathname, safePatch.redacted);
    const genericKind = changeKind(pathname, safePatch.redacted);
    const insertions = "insertions" in file ? file.insertions : 0;
    const deletions = "deletions" in file ? file.deletions : 0;
    const fileEvidence = evidence(pathname, "changed in selected diff", `${insertions} additions, ${deletions} deletions`);

    const genericFinding: Finding = {
      id: stableId(pathname, genericKind),
      kind: genericKind,
      title: `${pathname} changed`,
      detail: `Branchline classified this as ${genericKind.replaceAll("-", " ")}.`,
      confidence: confidenceFor(genericKind),
      severity: severityFor(genericKind),
      evidence: [fileEvidence],
      impactedFiles: [pathname],
    };
    findings.push(genericFinding);
    if (contract) findings.unshift(contract);

    const changeNodeId = `change:${pathname}`;
    graphNodes.push({ id: changeNodeId, label: pathname, kind: "change", path: pathname, confidence: contract?.confidence ?? genericFinding.confidence });
    if (contract) {
      const contractNodeId = `contract:${pathname}:${contract.metadata?.property}`;
      graphNodes.push({ id: contractNodeId, label: `${String(contract.metadata?.property)} contract`, kind: "contract", path: pathname, confidence: "high" });
      graphEdges.push({ id: stableId(changeNodeId, contractNodeId), source: changeNodeId, target: contractNodeId, label: "tightens", evidenceIds: contract.evidence.map((item) => item.id) });
      const consumers = await directConsumers(git, input.headCommit, pathname, [String(contract.metadata?.property), path.basename(pathname).replace(/\.[^.]+$/, "")]);
      for (const consumer of consumers) {
        const consumerId = `${TEST_FILE.test(consumer) ? "test" : "consumer"}:${consumer}`;
        graphNodes.push({ id: consumerId, label: consumer, kind: TEST_FILE.test(consumer) ? "test" : "consumer", path: consumer, confidence: "medium" });
        graphEdges.push({ id: stableId(contractNodeId, consumerId), source: contractNodeId, target: consumerId, label: TEST_FILE.test(consumer) ? "asserted by" : "consumed by", evidenceIds: contract.evidence.map((item) => item.id) });
        contract.impactedFiles.push(consumer);
      }
    }
  }

  const uniqueNodes = [...new Map(graphNodes.map((node) => [node.id, node])).values()];
  const uniqueEdges = [...new Map(graphEdges.map((edge) => [edge.id, edge])).values()];
  return {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    baseCommit: input.baseCommit,
    headCommit: input.headCommit,
    diffSummary: { filesChanged: summary.files.length, insertions: summary.insertions, deletions: summary.deletions },
    findings,
    graph: { nodes: uniqueNodes, edges: uniqueEdges },
    secretWarnings: [...new Set(secretWarnings)],
    createdAt: new Date().toISOString(),
  };
}
