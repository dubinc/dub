import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z.object({
  partnerId: z.string().min(1),
});

// GET /api/programs/[programId]/applications/history?partnerId= — applications for this program + partner email
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);
  const { partnerId } = querySchema.parse(searchParams);

  const partner = await prisma.partner.findFirst({
    where: {
      id: partnerId,
      programs: {
        some: {
          programId,
        },
      },
    },
    select: {
      email: true,
    },
  });

  if (!partner?.email) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner not found in this program.",
    });
  }

  const applicationsByEmail = await prisma.programApplication.findMany({
    where: {
      programId,
      email: partner.email,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      reviewedAt: true,
    },
  });

  const enrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      applicationId: true,
    },
  });

  let applications = applicationsByEmail;

  if (
    enrollment?.applicationId &&
    !applications.some((a) => a.id === enrollment.applicationId)
  ) {
    const fromEnrollment = await prisma.programApplication.findFirst({
      where: {
        id: enrollment.applicationId,
        programId,
      },
      select: {
        id: true,
        createdAt: true,
        reviewedAt: true,
      },
    });
    if (fromEnrollment) {
      applications = [...applications, fromEnrollment].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    }
  }

  return NextResponse.json({ applications });
});
