import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  getPartnerReferralsQuerySchema,
  referralSchema,
} from "@/lib/zod/schemas/referrals";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/programs/referrals - get all partner referrals for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, status, search, page, pageSize } =
      getPartnerReferralsQuerySchema.parse(searchParams);

    const partnerReferrals = await prisma.partnerReferral.findMany({
      where: {
        programId,
        ...(partnerId && { partnerId }),
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

    return NextResponse.json(z.array(referralSchema).parse(partnerReferrals));
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
