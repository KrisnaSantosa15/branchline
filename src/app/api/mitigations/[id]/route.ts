import { NextResponse } from "next/server";
import { z } from "zod";
import { updateMitigation } from "@/lib/persistence";

const mitigationSchema = z.object({ status: z.enum(["accepted", "rejected", "edited"]), editedContent: z.string().trim().max(5000).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const input = mitigationSchema.parse(await request.json());
    const mitigation = updateMitigation(id, input.status, input.editedContent);
    if (!mitigation) return NextResponse.json({ error: "Mitigation not found." }, { status: 404 });
    return NextResponse.json({ mitigation });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mitigation could not be updated." }, { status: 400 });
  }
}
