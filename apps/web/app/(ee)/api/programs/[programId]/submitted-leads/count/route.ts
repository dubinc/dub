import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  getSubmittedLeadsCountQuerySchema,
  submittedLeadsCountResponseSchema,
} from "@/lib/zod/schemas/submitted-leads";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma, SubmittedLeadStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/submitted-leads/count
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, status, search, groupBy } =
      getSubmittedLeadsCountQuerySchema.parse(searchParams);

    const commonWhere: Prisma.SubmittedLeadWhereInput = {
      programId,
      ...(partnerId && groupBy !== "partnerId" && { partnerId }),
      ...(groupBy === "status"
        ? {}
        : status
          ? { status }
          : {
              status: {
                notIn: [
                  SubmittedLeadStatus.unqualified,
                  SubmittedLeadStatus.closedLost,
                ],
              },
            }),
      ...(search
        ? search.includes("@")
          ? { email: search }
          : {
              email: { search: sanitizeFullTextSearch(search) },
              name: { search: sanitizeFullTextSearch(search) },
            }
        : {}),
    };

    // Get submitted leads count by status
    if (groupBy === "status") {
      const data = await prisma.submittedLead.groupBy({
        by: ["status"],
        where: commonWhere,
        _count: true,
        orderBy: {
          _count: {
            status: "desc",
          },
        },
      });

      // Fill in missing statuses with zero counts
      Object.values(SubmittedLeadStatus).forEach((status) => {
        if (!data.some((d) => d.status === status)) {
          data.push({ _count: 0, status });
        }
      });

      return NextResponse.json(submittedLeadsCountResponseSchema.parse(data));
    }

    // Get submitted leads count by partnerId
    if (groupBy === "partnerId") {
      const data = await prisma.submittedLead.groupBy({
        by: ["partnerId"],
        where: commonWhere,
        _count: true,
        orderBy: {
          _count: {
            partnerId: "desc",
          },
        },
        take: 10000,
      });

      return NextResponse.json(submittedLeadsCountResponseSchema.parse(data));
    }

    // Get submitted lead count
    const count = await prisma.submittedLead.count({
      where: commonWhere,
    });

    return NextResponse.json(submittedLeadsCountResponseSchema.parse(count));
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
