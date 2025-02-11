import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RewardfulImporter } from "../importer";

const schema = z.object({
  apiKey: z.string(),
  campaignId: z.string(),
});

// POST /api/programs/[programId]/rewardful/import - import a rewardful program
// This is entrypoint for the rewardful importer
export const POST = withWorkspace(async ({ workspace, params, req }) => {
  const { programId } = params;
  const { apiKey, campaignId } = schema.parse(await parseRequestBody(req));

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  // Start a background job to import
  await new RewardfulImporter(programId).start({
    apiKey,
    campaignId,
  });

  return NextResponse.json(program);
});
