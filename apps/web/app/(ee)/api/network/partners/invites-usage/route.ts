import { getNetworkInvitesUsage } from "@/lib/api/partners/get-network-invites-usage";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/network/partners/invites-usage - get the usage and limits for partner network invitations
export const GET = withWorkspace(
  async ({ workspace }) => {
    const usage = await getNetworkInvitesUsage(workspace);

    return NextResponse.json({
      usage,
      limit: workspace.networkInvitesLimit,
      remaining: Math.max(0, workspace.networkInvitesLimit - usage),
    });
  },
  {
    requiredPlan: ["enterprise", "advanced"],
  },
);
