import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { deletePartnerTag } from "@/lib/partner-tags/delete-partner-tag";
import { updatePartnerTag } from "@/lib/partner-tags/update-partner-tag";
import {
  createPartnerTagSchema,
  PartnerTagSchema,
} from "@/lib/zod/schemas/partner-tags";
import { NextResponse } from "next/server";

// PATCH /api/partner-tags/:partnerTagId - update a partner tag
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { partnerTagId } = params;

    const { name } = await createPartnerTagSchema.parseAsync(
      await parseRequestBody(req),
    );

    const partnerTag = await updatePartnerTag({
      partnerTagId,
      name,
      programId,
    });

    return NextResponse.json(PartnerTagSchema.parse(partnerTag));
  },
  {
    requiredPermissions: ["partnerTags.write"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);

// DELETE /api/partner-tags/:partnerTagId - delete a partner tag
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { partnerTagId } = params;

    await deletePartnerTag({
      partnerTagId,
      programId,
    });

    return NextResponse.json({
      id: partnerTagId,
    });
  },
  {
    requiredPermissions: ["partnerTags.write"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
