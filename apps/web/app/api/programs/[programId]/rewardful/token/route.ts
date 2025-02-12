import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { setRewardfulConfig } from "@/lib/rewardful/importer";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
});

// POST /api/programs/[programId]/rewardful/token - set the rewardful token in the Redis
export const POST = withWorkspace(
  async ({ workspace, session, params, req }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { token } = schema.parse(await parseRequestBody(req));

    await setRewardfulConfig({
      token,
      programId,
      userId: session.user.id,
    });

    return NextResponse.json("OK");
  },
);
