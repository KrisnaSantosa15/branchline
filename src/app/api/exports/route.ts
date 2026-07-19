import { NextResponse } from "next/server";
import { z } from "zod";
import { exportReleaseBrief } from "@/lib/artifacts";
import { getAnalysis, getLatestCouncilReview, getScenario, getWorkspace, listMitigations } from "@/lib/persistence";

const exportSchema = z.object({ workspaceId: z.string().uuid(), analysisId: z.string().uuid(), scenarioId: z.string().uuid(), format: z.enum(["markdown", "json"]) });

export async function POST(request: Request) {
  try {
    const input = exportSchema.parse(await request.json());
    const [workspace, analysis, scenario] = [getWorkspace(input.workspaceId), getAnalysis(input.analysisId), getScenario(input.scenarioId)];
    if (!workspace || !analysis || !scenario) return NextResponse.json({ error: "Export source records were not found." }, { status: 404 });
    const councilReview = getLatestCouncilReview(input.workspaceId, input.analysisId, input.scenarioId) ?? getLatestCouncilReview(input.workspaceId, input.analysisId);
    const artifact = exportReleaseBrief(workspace, analysis, scenario, listMitigations(analysis.id), councilReview);
    return NextResponse.json({ format: input.format, content: input.format === "markdown" ? artifact.markdown : JSON.stringify(artifact.json, null, 2) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed." }, { status: 400 });
  }
}
