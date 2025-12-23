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
    const { page, pageSize, ...queryParams } =
      fraudEventQuerySchema.parse(searchParams);

    let where: Prisma.FraudEventWhereInput = {};
    let eventGroupType: FraudRuleType | undefined;

    // Filter by group ID
    if ("groupId" in queryParams) {
      const { groupId } = queryParams;

      const fraudGroup = await prisma.fraudEventGroup.findUnique({
        where: {
          id: groupId,
        },
        select: {
          programId: true,
          partnerId: true,
          type: true,
        },
      });

      if (!fraudGroup) {
        throw new DubApiError({
          code: "not_found",
          message: "Fraud event group not found.",
        });
      }

      if (fraudGroup.programId !== programId) {
        throw new DubApiError({
          code: "not_found",
          message: "Fraud event group not found in this program.",
        });
      }

      where = {
        fraudEventGroupId: groupId,
      };

      eventGroupType = fraudGroup.type;

      // Special case for partnerCrossProgramBan rule type
      if (eventGroupType === FraudRuleType.partnerCrossProgramBan) {
        const bannedProgramEnrollments =
          await prisma.programEnrollment.findMany({
            where: {
              partnerId: fraudGroup.partnerId,
              programId: {
                not: programId,
              },
              status: "banned",
            },
            select: {
              bannedAt: true,
              bannedReason: true,
            },
          });

        return NextResponse.json(
          z
            .array(fraudEventSchemas["partnerCrossProgramBan"])
            .parse(bannedProgramEnrollments),
        );
      }
    }

    // Filter by customer ID and type
    // Currently this is only used in E2E tests to fetch raw fraud events for a given customer + type
    if ("customerId" in queryParams && "type" in queryParams) {
      const { customerId, type } = queryParams;

      where = {
        customerId,
        fraudEventGroup: {
          programId,
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

    const zodSchema = fraudEventSchemas[eventGroupType];

    const fraudEvents = await prisma.fraudEvent.findMany({
      where,
      include: {
        partner: true,
        customer: true,
      },
      orderBy: {
        id: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json(z.array(zodSchema).parse(fraudEvents));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
