import { NextResponse } from "next/server";
import { getScenario } from "@/lib/persistence";
import { compareScenarios } from "@/lib/simulation";

export async function GET(_: Request, context: { params: Promise<{ id: string; otherId: string }> }) {
  const { id, otherId } = await context.params;
  const primary = getScenario(id);
  const alternate = getScenario(otherId);
  if (!primary || !alternate) return NextResponse.json({ error: "One or both scenarios were not found." }, { status: 404 });
  return NextResponse.json({ comparison: compareScenarios(primary, alternate) });
}
