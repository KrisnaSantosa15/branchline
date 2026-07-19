import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeRepository } from "@/lib/analysis";
import { deterministicMitigations } from "@/lib/artifacts";
import { getWorkspace, saveAnalysis, saveMitigation } from "@/lib/persistence";

const analysisSchema = z.object({ baseCommit: z.string().min(7), headCommit: z.string().min(7) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const workspace = getWorkspace(id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    const input = analysisSchema.parse(await request.json());
    const analysis = await analyzeRepository({ workspaceId: id, repositoryPath: workspace.repositoryPath, ...input });
    saveAnalysis(analysis);
    const mitigations = deterministicMitigations(id, analysis).map(saveMitigation);
    return NextResponse.json({ analysis, mitigations });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analysis failed." }, { status: 400 });
  }
}
