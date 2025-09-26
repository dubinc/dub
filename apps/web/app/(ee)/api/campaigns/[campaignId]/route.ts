import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId] - get an email campaign
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { campaignId } = params;

    const programId = getDefaultProgramIdOrThrow(workspace);

    return NextResponse.json({});
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);

// PATCH /api/campaigns/[campaignId] - update an email campaign
export const PATCH = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    return NextResponse.json({});
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);

// PATCH /api/campaigns/[campaignId] - delete an email campaign
export const DELETE = withWorkspace(
  async ({ workspace, params, session }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    return NextResponse.json({ id: campaignId });
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
