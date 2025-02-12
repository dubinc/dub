import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  fetchRewardfulConfig,
  queueRewardfulImport,
} from "@/lib/rewardful/importer";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  campaignId: z.string().describe("Rewardful campaign ID to import."),
});

// POST /api/programs/[programId]/rewardful/import - import a rewardful program
export const POST = withWorkspace(
  async ({ workspace, session, params, req }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { campaignId } = schema.parse(await parseRequestBody(req));

    // check the Rewardful token exists before queueing the import
    await fetchRewardfulConfig(programId);

    await queueRewardfulImport({
      programId,
      campaignId,
    });

    return NextResponse.json("OK");
  },
);
