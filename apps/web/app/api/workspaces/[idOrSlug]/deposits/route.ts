import { withWorkspace } from "@/lib/auth";
import { retrieveTransfers } from "@/lib/dots/retrieve-transfers";
import { dotsDepositsSchema } from "@/lib/dots/schemas";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/deposits – get deposits for a workspace
export const GET = withWorkspace(async ({ workspace }) => {
  const { dotsAppId } = workspace;

  if (!dotsAppId) {
    return NextResponse.json({ data: [], has_more: false });
  }

  const { data, has_more } = await retrieveTransfers({
    dotsAppId,
    type: "refill",
  });

  const processedData = data.map((t) => {
    return {
      ...t,
      platform: t.external_data?.platform,
    };
  });

  return NextResponse.json(
    dotsDepositsSchema.parse({ data: processedData, has_more }),
  );
});
