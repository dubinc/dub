import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/partners/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    const { groupBy, status, country } =
      partnersCountQuerySchema.parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    // Get partner count by country
    if (groupBy === "country") {
      const partners = await prisma.partner.groupBy({
        by: ["country"],
        where: {
          programs: {
            some: {
              programId,
            },
            ...(status && {
              every: {
                status,
              },
            }),
          },
        },
        _count: true,
        orderBy: {
          _count: {
            country: "desc",
          },
        },
      });

      return NextResponse.json(partners);
    }

    // Get partner count by status
    if (groupBy === "status") {
      const partners = await prisma.programEnrollment.groupBy({
        by: ["status"],
        where: {
          programId,
          ...(country && {
            partner: {
              country,
            },
          }),
        },
        _count: true,
      });

      // Find missing statuses
      const missingStatuses = Object.values(ProgramEnrollmentStatus).filter(
        (status) => !partners.some((p) => p.status === status),
      );

      // Add missing statuses with count 0
      missingStatuses.forEach((status) => {
        partners.push({ _count: 0, status });
      });

      return NextResponse.json(partners);
    }

    // Get absolute count of partners
    const count = await prisma.programEnrollment.count({
      where: {
        programId,
      },
    });

    return NextResponse.json(count);
  },
);
