import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  fraudEventQuerySchema,
  fraudEventSchemas,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudRuleType, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/fraud/events - Get the fraud events for a group
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const parsedQueryParams = fraudEventQuerySchema.parse(searchParams);

    let where: Prisma.FraudEventWhereInput = {};
    let eventGroupType: FraudRuleType | undefined;

    if ("groupId" in parsedQueryParams) {
      const { groupId } = parsedQueryParams;

      const fraudEventGroup = await prisma.fraudEventGroup.findUnique({
        where: {
          id: groupId,
        },
        select: {
          programId: true,
          type: true,
        },
      });

      if (!fraudEventGroup) {
        throw new DubApiError({
          code: "not_found",
          message: "Fraud event group not found.",
        });
      }

      if (fraudEventGroup.programId !== programId) {
        throw new DubApiError({
          code: "not_found",
          message: "Fraud event group not found in this program.",
        });
      }

      where = {
        fraudEventGroupId: groupId,
      };

      eventGroupType = fraudEventGroup.type;
    }

    if ("customerId" in parsedQueryParams && "type" in parsedQueryParams) {
      const { customerId, type } = parsedQueryParams;

      where = {
        customerId,
        fraudEventGroup: {
          type,
        },
      };

      eventGroupType = type;
    }

    if (!eventGroupType) {
      throw new DubApiError({
        code: "not_found",
        message: "Fraud event group type not found.",
      });
    }

    const fraudEvents = await prisma.fraudEvent.findMany({
      where,
      include: {
        partner: true,
        customer: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const zodSchema = fraudEventSchemas[eventGroupType];

    return NextResponse.json(z.array(zodSchema).parse(fraudEvents));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
