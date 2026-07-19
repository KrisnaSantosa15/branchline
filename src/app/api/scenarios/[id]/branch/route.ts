import { NextResponse } from "next/server";
import { z } from "zod";
import { getScenario, saveScenario } from "@/lib/persistence";
import { branchScenario } from "@/lib/simulation";

const branchSchema = z.object({ title: z.string().trim().min(3).max(100) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const input = branchSchema.parse(await request.json());
    const scenario = getScenario(id);
    if (!scenario) return NextResponse.json({ error: "Scenario not found." }, { status: 404 });
    return NextResponse.json({ scenario: saveScenario(branchScenario(scenario, input.title)) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scenario could not branch." }, { status: 400 });
  }
}
