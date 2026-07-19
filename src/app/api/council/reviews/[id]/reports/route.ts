import { NextResponse } from "next/server";
import { z } from "zod";
import { synthesizeCouncil, validateCouncilReport } from "@/lib/council";
import { getCouncilReview, saveCouncilReview } from "@/lib/persistence";

const reportSchema = z.object({ report: z.unknown() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const input = reportSchema.parse(await request.json());
    const review = getCouncilReview(id);
    if (!review) return NextResponse.json({ error: "Council review not found." }, { status: 404 });
    const report = validateCouncilReport(input.report, review.evidencePack);
    const nextReports = [...review.reports.filter((item) => item.role !== report.role), report];
    const synthesis = synthesizeCouncil(review.evidencePack, nextReports);
    const updated = saveCouncilReview({ ...review, reports: nextReports, updatedAt: new Date().toISOString() });
    return NextResponse.json({ review: updated, synthesis });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Council report could not be imported." }, { status: 400 });
  }
}
