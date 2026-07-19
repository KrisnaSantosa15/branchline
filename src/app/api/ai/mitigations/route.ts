import { NextResponse } from "next/server";
import { z } from "zod";
import { generateModelMitigation } from "@/lib/ai";
import { getAnalysis, saveMitigation } from "@/lib/persistence";

const aiSchema = z.object({ workspaceId: z.string().uuid(), analysisId: z.string().uuid(), selectedEvidenceIds: z.array(z.string()).min(1) });

export async function POST(request: Request) {
  try {
    const input = aiSchema.parse(await request.json());
    const analysis = getAnalysis(input.analysisId);
    if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    const mitigation = await generateModelMitigation({ workspaceId: input.workspaceId, analysis, selectedEvidenceIds: input.selectedEvidenceIds });
    return NextResponse.json({ mitigation: saveMitigation(mitigation) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Model-assisted mitigation failed." }, { status: 400 });
  }
}
