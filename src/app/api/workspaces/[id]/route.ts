import { NextResponse } from "next/server";
import { getLatestAnalysis, getWorkspace, listMitigations, listScenarios } from "@/lib/persistence";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workspace = getWorkspace(id);
  if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const analysis = getLatestAnalysis(id);
  return NextResponse.json({
    workspace,
    analysis,
    scenarios: listScenarios(id),
    mitigations: analysis ? listMitigations(analysis.id) : [],
  });
}
