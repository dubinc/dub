import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partners/count - get the count of partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { groupBy, status, country, search, partnerIds, groupId } =
      partnersCountQuerySchema.parse(searchParams);

    const commonWhere: Prisma.PartnerWhereInput = {
      ...(search && {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      }),
      ...(partnerIds && {
        id: { in: partnerIds },
      }),
    };

    // Get partner count by country
    if (groupBy === "country") {
      const partners = await prisma.partner.groupBy({
        by: ["country"],
        where: {
          programs: {
            some: {
              programId,
              ...(groupId && {
                groupId,
              }),
            },
            every: {
              status: status || {
                in: ["approved", "invited"],
              },
            },
          },
          ...commonWhere,
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
          ...(groupId && {
            groupId,
          }),
          partner: {
            ...(country && {
              country,
            }),
            ...commonWhere,
          },
        },
        _count: true,
        orderBy: {
          _count: {
            status: "desc",
          },
        },
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

    // Get partner count by group
    if (groupBy === "groupId") {
      const partners = await prisma.programEnrollment.groupBy({
        by: ["groupId"],
        where: {
          programId,
          partner: {
            ...(country && {
              country,
            }),
            ...commonWhere,
          },
          status: status || {
            in: ["approved", "invited"],
          },
        },
        _count: true,
        orderBy: {
          _count: {
            groupId: "desc",
          },
        },
      });

      return NextResponse.json(partners);
    }

    // Get absolute count of partners
    const count = await prisma.programEnrollment.count({
      where: {
        programId,
        status: status || {
          in: ["approved", "invited"],
        },
        ...(groupId && {
          groupId,
        }),
        partner: {
          ...(country && {
            country,
          }),
          ...commonWhere,
        },
      },
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
