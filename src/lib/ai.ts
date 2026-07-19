import { z } from "zod";
import type { AnalysisResult, Mitigation } from "@/lib/domain";

const proposalSchema = z.object({
  title: z.string().min(8),
  rationale: z.string().min(20),
  verification: z.string().min(12),
  fallback: z.string().min(12),
  owner: z.enum(["engineering", "release-captain", "on-call", "support"]),
});

type AdvisorConfiguration = {
  endpoint: string;
  model: string;
  apiKey?: string;
};

type ChatCompletion = {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
};

function isLoopback(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function advisorConfiguration(): AdvisorConfiguration | undefined {
  const endpoint = process.env.BRANCHLINE_ADVISOR_ENDPOINT?.trim();
  if (!endpoint) return undefined;
  const model = process.env.BRANCHLINE_ADVISOR_MODEL?.trim();
  if (!model) throw new Error("Set BRANCHLINE_ADVISOR_MODEL with the advisor endpoint.");
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error("BRANCHLINE_ADVISOR_ENDPOINT must be a complete URL.");
  }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLoopback(parsed.hostname))) {
    throw new Error("Advisor endpoints must use HTTPS, except a loopback local provider.");
  }
  return { endpoint: parsed.toString(), model, apiKey: process.env.BRANCHLINE_ADVISOR_API_KEY?.trim() || undefined };
}

function contentFrom(response: ChatCompletion) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");
  throw new Error("Advisor response did not include a text completion.");
}

function jsonFrom(content: string) {
  return content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

export async function generateModelMitigation(input: { workspaceId: string; analysis: AnalysisResult; selectedEvidenceIds: string[] }): Promise<Mitigation> {
  const advisor = advisorConfiguration();
  if (!advisor) throw new Error("Advisor assistance is unavailable until BRANCHLINE_ADVISOR_ENDPOINT and BRANCHLINE_ADVISOR_MODEL are configured.");
  const selectedEvidence = input.analysis.findings
    .flatMap((finding) => finding.evidence)
    .filter((item) => input.selectedEvidenceIds.includes(item.id));
  if (!selectedEvidence.length) throw new Error("Select at least one redacted evidence item before requesting advisor assistance.");
  const response = await fetch(advisor.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(advisor.apiKey ? { Authorization: `Bearer ${advisor.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: advisor.model,
      messages: [
        {
          role: "developer",
          content: "You are Branchline, an engineering release-impact assistant. Return only valid JSON with title, rationale, verification, fallback, and owner. Do not claim certainty or production telemetry. Base every suggestion solely on the supplied evidence.",
        },
        {
          role: "user",
          content: JSON.stringify({ findings: input.analysis.findings.map((finding) => ({ title: finding.title, detail: finding.detail, severity: finding.severity })), evidence: selectedEvidence }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Advisor request failed with HTTP ${response.status}.`);
  const parsed = proposalSchema.parse(JSON.parse(jsonFrom(contentFrom((await response.json()) as ChatCompletion))));
  const createdAt = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    analysisId: input.analysis.id,
    ...parsed,
    evidenceIds: selectedEvidence.map((item) => item.id),
    source: "model",
    status: "proposed",
    createdAt,
    updatedAt: createdAt,
  };
}
