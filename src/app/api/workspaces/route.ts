import { NextResponse } from "next/server";
import { z } from "zod";
import { createWorkspace, listWorkspaces } from "@/lib/persistence";
import { connectRepositorySource, RepositoryError } from "@/lib/repository";

const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  source: z.string().trim().min(1),
});

export async function GET() {
  return NextResponse.json({ workspaces: listWorkspaces() });
}

export async function POST(request: Request) {
  try {
    const input = workspaceSchema.parse(await request.json());
    const repository = await connectRepositorySource(input.source);
    const workspace = createWorkspace({ name: input.name, repositoryPath: repository.repositoryPath, source: repository.source, commits: repository.commits });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    const message = error instanceof RepositoryError || error instanceof z.ZodError ? error.message : "Branchline could not connect this repository.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
