import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createPartnerTag } from "@/lib/partner-tags/create-partner-tag";
import { listPartnerTags } from "@/lib/partner-tags/list-partner-tags";
import {
  createPartnerTagSchema,
  listPartnerTagsQuerySchema,
  listPartnerTagsResponseSchema,
  PartnerTagSchema,
} from "@/lib/zod/schemas/partner-tags";
import { NextResponse } from "next/server";

// GET /api/partner-tags - list partner tags
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { sortOrder, search, ids, pageSize, startingAfter, endingBefore } =
      await listPartnerTagsQuerySchema.parseAsync(searchParams);

    const partnerTags = await listPartnerTags({
      sortOrder,
      pageSize,
      startingAfter,
      endingBefore,
      ids,
      search,
      programId,
    });

    const response = listPartnerTagsResponseSchema.parse(partnerTags);

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["partnerTags.read"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);

// POST /api/partner-tags - create a partner tag
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { name } = await createPartnerTagSchema.parseAsync(
      await parseRequestBody(req),
    );

    const partnerTag = await createPartnerTag({
      name,
      workspace,
      programId,
    });

    const response = PartnerTagSchema.parse(partnerTag);

    return NextResponse.json(response, { status: 201 });
  },
  {
    requiredPermissions: ["partnerTags.write"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
