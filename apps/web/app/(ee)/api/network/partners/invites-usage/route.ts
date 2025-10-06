import { DubApiError } from "@/lib/api/errors";
import { getNetworkInvitesUsage } from "@/lib/api/partners/get-network-invites-usage";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/network/partners/invites-usage - get the usage and limits for partner network invitations
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerNetworkEnabledAt } = await prisma.program.findUniqueOrThrow({
      select: {
        partnerNetworkEnabledAt: true,
      },
      where: {
        id: programId,
      },
    });
    if (!partnerNetworkEnabledAt)
      throw new DubApiError({
        code: "forbidden",
        message: "Partner network is not enabled for this program.",
      });

    const usage = await getNetworkInvitesUsage({
      workspaceId: workspace.id,
    });

    return NextResponse.json({
      usage,
      limit: workspace.networkInvitesLimit,
      remaining: Math.max(0, workspace.networkInvitesLimit - usage),
    });
  },
  {
    requiredPlan: ["enterprise"],
  },
);
