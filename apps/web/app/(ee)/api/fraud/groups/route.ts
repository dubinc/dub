import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  fraudGroupQuerySchema,
  fraudGroupSchema,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/fraud/groups - Get the fraud event groups for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      status,
      type,
      partnerId,
      groupId,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = fraudGroupQuerySchema.parse(searchParams);

    const fraudGroups = await prisma.fraudEventGroup.findMany({
      where: {
        programId,
        ...(partnerId && { partnerId }),
        ...(status && { status }),
        ...(type && { type }),
        ...(groupId && { id: groupId }),
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        programEnrollment: {
          select: {
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    // Transform data to merge programEnrollment.status into partner object
    const transformedGroups = fraudGroups.map((group) => ({
      ...group,
      partner: {
        ...group.partner,
        status: group.programEnrollment.status,
      },
    }));

    return NextResponse.json(
      z.array(fraudGroupSchema).parse(transformedGroups),
    );
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
