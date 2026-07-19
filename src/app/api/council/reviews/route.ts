import { NextResponse } from "next/server";
import { z } from "zod";
import { createCouncilEvidencePack, startCouncilReview, synthesizeCouncil } from "@/lib/council";
import { getAnalysis, getScenario, getWorkspace, saveCouncilReview } from "@/lib/persistence";

const reviewSchema = z.object({ workspaceId: z.string().uuid(), analysisId: z.string().uuid(), scenarioId: z.string().uuid().optional() });

export async function POST(request: Request) {
  try {
    const input = reviewSchema.parse(await request.json());
    const [workspace, analysis, scenario] = [getWorkspace(input.workspaceId), getAnalysis(input.analysisId), input.scenarioId ? getScenario(input.scenarioId) : undefined];
    if (!workspace || !analysis || (input.scenarioId && (!scenario || scenario.analysisId !== analysis.id))) return NextResponse.json({ error: "Council review source records were not found." }, { status: 404 });
    const evidencePack = createCouncilEvidencePack({ workspace, analysis, scenario });
    const review = saveCouncilReview(startCouncilReview({ workspaceId: workspace.id, analysisId: analysis.id, scenarioId: scenario?.id, evidencePack }));
    return NextResponse.json({ review, synthesis: synthesizeCouncil(evidencePack, []) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Council review could not be created." }, { status: 400 });
  }
}
