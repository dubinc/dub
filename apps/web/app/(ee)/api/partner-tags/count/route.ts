import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { countPartnerTags } from "@/lib/partner-tags/count-partner-tags";
import { getPartnerTagsCountQuerySchema } from "@/lib/zod/schemas/partner-tags";
import { NextResponse } from "next/server";

// GET /api/partner-tags/count - get count of partner tags
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { search } = getPartnerTagsCountQuerySchema.parse(searchParams);

    const count = await countPartnerTags({
      search,
      programId,
    });

    return NextResponse.json(count);
  },
  {
    requiredPermissions: ["partnerTags.read"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
