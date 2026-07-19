import { NextResponse } from "next/server";
import { z } from "zod";
import { getCouncilReview, saveCouncilReview } from "@/lib/persistence";

const decisionSchema = z.object({
  status: z.enum(["approved", "blocked", "accepted-risk", "request-evidence"]),
  decisionNote: z.string().trim().min(3).max(2000),
  requiredFollowUps: z.array(z.string().trim().min(3).max(500)).max(12),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const input = decisionSchema.parse(await request.json());
    const review = getCouncilReview(id);
    if (!review) return NextResponse.json({ error: "Council review not found." }, { status: 404 });
    const updated = saveCouncilReview({ ...review, ...input, updatedAt: new Date().toISOString() });
    return NextResponse.json({ review: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Council decision could not be saved." }, { status: 400 });
  }
}
