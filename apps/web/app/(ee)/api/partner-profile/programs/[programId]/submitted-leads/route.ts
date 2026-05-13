import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  getPartnerSubmittedLeadsQuerySchema,
  partnerProfileSubmittedLeadSchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/programs/[programId]/submitted-leads
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = params;
    const {
      status,
      search,
      page = 1,
      pageSize,
    } = getPartnerSubmittedLeadsQuerySchema.parse(searchParams);

    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: programId,
      include: {
        program: true,
      },
    });

    const lead = await prisma.submittedLead.findMany({
      where: {
        programId: program.id,
        partnerId: partner.id,
        ...(status && { status }),
        ...(search
          ? search.includes("@")
            ? { email: search }
            : {
                email: { search: sanitizeFullTextSearch(search) },
                name: { search: sanitizeFullTextSearch(search) },
              }
          : {}),
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      z.array(partnerProfileSubmittedLeadSchema).parse(lead),
    );
  },
);
