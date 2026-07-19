import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnalysis, getScenario, saveScenario } from "@/lib/persistence";
import { applyDecision } from "@/lib/simulation";

const decisionSchema = z.object({ decision: z.enum(["full-rollout", "canary", "compatibility-adapter", "rollback"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const input = decisionSchema.parse(await request.json());
    const scenario = getScenario(id);
    if (!scenario) return NextResponse.json({ error: "Scenario not found." }, { status: 404 });
    const analysis = getAnalysis(scenario.analysisId);
    if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    const updated = saveScenario(applyDecision(scenario, analysis, input.decision));
    return NextResponse.json({ scenario: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Decision could not be applied." }, { status: 400 });
  }
}
