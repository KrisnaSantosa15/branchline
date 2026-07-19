import { NextResponse } from "next/server";
import { advisorConfiguration } from "@/lib/ai";

export async function GET() {
  try {
    const advisor = advisorConfiguration();
    return NextResponse.json({ advisorAssistance: Boolean(advisor), advisorModel: advisor?.model ?? null });
  } catch (error) {
    return NextResponse.json({ advisorAssistance: false, advisorModel: null, advisorError: error instanceof Error ? error.message : "Advisor configuration is invalid." });
  }
}
