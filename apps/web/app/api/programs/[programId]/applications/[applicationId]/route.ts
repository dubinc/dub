import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withWorkspace(async ({ workspace, params }) => {
  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId: params.programId,
  });

  const application = await prisma.programApplication.findUnique({
    where: { id: params.applicationId },
  });

  if (!application || application.programId !== params.programId) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(application);
});
