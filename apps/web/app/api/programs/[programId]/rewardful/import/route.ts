import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  campaignId: z.string().describe("Rewardful campaign ID to import."),
});

// POST /api/programs/[programId]/rewardful/import - import a rewardful program
export const POST = withWorkspace(async ({ workspace, params, req }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const { campaignId } = schema.parse(await parseRequestBody(req));

  const credentials = await rewardfulImporter.getCredentials(programId);

  await rewardfulImporter.setCredentials({
    ...credentials,
    programId,
    campaignId,
  });

  await rewardfulImporter.queue({
    programId,
  });

  return NextResponse.json("OK");
});
