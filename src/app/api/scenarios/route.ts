import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnalysis, getWorkspace, saveScenario } from "@/lib/persistence";
import { startScenario } from "@/lib/simulation";

const scenarioSchema = z.object({ workspaceId: z.string().uuid(), analysisId: z.string().uuid(), title: z.string().trim().min(3).max(100).optional() });

export async function POST(request: Request) {
  try {
    const input = scenarioSchema.parse(await request.json());
    const [workspace, analysis] = [getWorkspace(input.workspaceId), getAnalysis(input.analysisId)];
    if (!workspace || !analysis) return NextResponse.json({ error: "Workspace or analysis not found." }, { status: 404 });
    const scenario = saveScenario(startScenario(workspace.id, analysis, input.title));
    return NextResponse.json({ scenario }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scenario creation failed." }, { status: 400 });
  }
}
