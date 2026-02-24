import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { movePartnersToGroup } from "@/lib/api/groups/move-partners-to-group";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const addPartnersToGroupSchema = z.object({
  partnerIds: z.array(z.string()).min(1).max(100), // max move 100 partners at a time
});

// POST /api/groups/[groupIdOrSlug]/partners - add partners to group
export const POST = withWorkspace(
  async ({ req, params, workspace, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId: params.groupIdOrSlug,
      includeExpandedFields: true,
    });

    let { partnerIds } = addPartnersToGroupSchema.parse(
      await parseRequestBody(req),
    );

    partnerIds = [...new Set(partnerIds)];

    if (partnerIds.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "At least one partner ID is required.",
      });
    }

    const count = await movePartnersToGroup({
      workspaceId: workspace.id,
      programId,
      partnerIds,
      userId: session.user.id,
      group,
    });

    return NextResponse.json({
      count,
    });
  },
  {
    requiredPermissions: ["groups.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
