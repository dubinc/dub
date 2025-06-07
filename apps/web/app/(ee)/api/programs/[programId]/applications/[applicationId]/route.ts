import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withWorkspace(async ({ workspace, params }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const application = await prisma.programApplication.findUnique({
    where: { id: params.applicationId },
  });

  if (!application || application.programId !== programId) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(application);
});
