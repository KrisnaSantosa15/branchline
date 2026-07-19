import OpenAI from "openai";
import { z } from "zod";
import type { AnalysisResult, Mitigation } from "@/lib/domain";

const proposalSchema = z.object({
  title: z.string().min(8),
  rationale: z.string().min(20),
  verification: z.string().min(12),
  fallback: z.string().min(12),
  owner: z.enum(["engineering", "release-captain", "on-call", "support"]),
});

export async function generateModelMitigation(input: { workspaceId: string; analysis: AnalysisResult; selectedEvidenceIds: string[] }): Promise<Mitigation> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Model assistance is unavailable until OPENAI_API_KEY is configured.");
  const selectedEvidence = input.analysis.findings
    .flatMap((finding) => finding.evidence)
    .filter((item) => input.selectedEvidenceIds.includes(item.id));
  if (!selectedEvidence.length) throw new Error("Select at least one redacted evidence item before requesting model assistance.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6",
    input: [
      {
        role: "developer",
        content:
          "You are Branchline, an engineering release-impact assistant. Return only valid JSON with title, rationale, verification, fallback, and owner. Do not claim certainty or production telemetry. Base every suggestion solely on the supplied evidence.",
      },
      {
        role: "user",
        content: JSON.stringify({ findings: input.analysis.findings.map((finding) => ({ title: finding.title, detail: finding.detail, severity: finding.severity })), evidence: selectedEvidence }),
      },
    ],
  });
  const parsed = proposalSchema.parse(JSON.parse(response.output_text));
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
