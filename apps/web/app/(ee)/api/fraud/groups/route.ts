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
        partner: true,
        user: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    return NextResponse.json(z.array(fraudGroupSchema).parse(fraudGroups));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
