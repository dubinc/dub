import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withWorkspace(async ({ workspace, params }) => {
  if (params.programId !== workspace.defaultProgramId) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

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
