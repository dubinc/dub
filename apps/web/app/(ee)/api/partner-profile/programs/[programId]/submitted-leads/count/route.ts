import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  getPartnerSubmittedLeadsCountQuerySchema,
  partnerSubmittedLeadsCountResponseSchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma, SubmittedLeadStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/submitted-leads/count
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = params;
    const { status, search, groupBy } =
      getPartnerSubmittedLeadsCountQuerySchema.parse(searchParams);

    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: programId,
      include: {
        program: true,
      },
    });

    const commonWhere: Prisma.SubmittedLeadWhereInput = {
      programId: program.id,
      partnerId: partner.id,
      ...(status && groupBy !== "status" && { status }),
      ...(search
        ? search.includes("@")
          ? { email: search }
          : {
              email: { search: sanitizeFullTextSearch(search) },
              name: { search: sanitizeFullTextSearch(search) },
            }
        : {}),
    };

    // Get submitted lead count by status
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

      return NextResponse.json(
        partnerSubmittedLeadsCountResponseSchema.parse(data),
      );
    }

    // Get submitted lead count
    const count = await prisma.submittedLead.count({
      where: commonWhere,
    });

    return NextResponse.json(
      partnerSubmittedLeadsCountResponseSchema.parse(count),
    );
  },
);
