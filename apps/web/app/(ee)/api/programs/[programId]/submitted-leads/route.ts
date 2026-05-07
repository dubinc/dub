import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  getSubmittedLeadsQuerySchema,
  submittedLeadSchema,
} from "@/lib/zod/schemas/submitted-leads";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { SubmittedLeadStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/programs/[programId]/submitted-leads
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      partnerId,
      status,
      search,
      page = 1,
      pageSize,
    } = getSubmittedLeadsQuerySchema.parse(searchParams);

    const submittedLeads = await prisma.submittedLead.findMany({
      where: {
        programId,
        ...(partnerId && { partnerId }),
        ...(status
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
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      z.array(submittedLeadSchema).parse(submittedLeads),
    );
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
