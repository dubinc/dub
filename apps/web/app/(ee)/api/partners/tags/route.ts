import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PartnerTagSchema,
  getPartnerTagsQuerySchema,
} from "@/lib/zod/schemas/partner-tags";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partners/tags - get all partner tags
export const GET = withWorkspace(
  async ({ workspace, headers, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { search, ids, sortBy, sortOrder, page, pageSize } =
      getPartnerTagsQuerySchema.parse(searchParams);

    const partnerTags = await prisma.partnerTag.findMany({
      where: {
        programId,
        ...(search && {
          name: {
            contains: search,
          },
        }),
        ...(ids && {
          id: {
            in: ids,
          },
        }),
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    return NextResponse.json(z.array(PartnerTagSchema).parse(partnerTags), {
      headers,
    });
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
