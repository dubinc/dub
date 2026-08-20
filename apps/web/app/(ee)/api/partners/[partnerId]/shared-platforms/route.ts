import { DubApiError } from "@/lib/api/errors";
import { getSharedPartnerPlatforms } from "@/lib/api/partners/get-shared-partner-platforms";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnerProgramSharedPlatformSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partners/:partnerId/shared-platforms – other partners in this program with the same verified platform identifiers
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { partnerId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {},
    });

    const sharedPlatforms = await getSharedPartnerPlatforms({
      partnerId,
      programId,
    });

    if (sharedPlatforms === null) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    return NextResponse.json(
      z.array(partnerProgramSharedPlatformSchema).parse(sharedPlatforms),
    );
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
