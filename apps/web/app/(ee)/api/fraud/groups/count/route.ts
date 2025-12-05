import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  fraudGroupCountQuerySchema,
  fraudGroupCountSchema,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudRuleType, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/fraud/groups/count - get the count of fraud event groups for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { status, type, partnerId, groupId, groupBy } =
      fraudGroupCountQuerySchema.parse(searchParams);

    const commonWhere: Prisma.FraudEventGroupWhereInput = {
      programId,
      ...(status && { status }),
      ...(type && { type }),
      ...(partnerId && { partnerId }),
      ...(groupId && { id: groupId }),
    };

    // Group by type
    if (groupBy === "type") {
      const fraudGroups = await prisma.fraudEventGroup.groupBy({
        by: ["type"],
        where: {
          ...commonWhere,
        },
        _count: true,
        orderBy: {
          _count: {
            type: "desc",
          },
        },
      });

      Object.values(FraudRuleType).forEach((type) => {
        if (!fraudGroups.some((e) => e.type === type)) {
          fraudGroups.push({ _count: 0, type });
        }
      });

      return NextResponse.json(
        z.array(fraudGroupCountSchema).parse(fraudGroups),
      );
    }

    // Group by partnerId
    if (groupBy === "partnerId") {
      const fraudGroups = await prisma.fraudEventGroup.groupBy({
        by: ["partnerId"],
        where: {
          ...commonWhere,
        },
        _count: true,
        orderBy: {
          _count: {
            partnerId: "desc",
          },
        },
      });

      return NextResponse.json(
        z.array(fraudGroupCountSchema).parse(fraudGroups),
      );
    }

    // Get the count of fraud event groups
    const count = await prisma.fraudEventGroup.count({
      where: {
        ...commonWhere,
      },
    });

    return NextResponse.json(fraudGroupCountSchema.parse(count));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
