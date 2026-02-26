import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../guard";

// GET /api/e2e/workflows - Find workflow by bountyId, campaignId, or groupId
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  assertE2EWorkspace(workspace);

  const programId = getDefaultProgramIdOrThrow(workspace);

  const { bountyId, campaignId, groupId } = searchParams;

  const workflow = await prisma.workflow.findFirst({
    where: {
      programId,
      ...(bountyId && { bounty: { id: bountyId } }),
      ...(campaignId && { campaign: { id: campaignId } }),
      ...(groupId && { partnerGroup: { id: groupId } }),
    },
    select: {
      id: true,
      trigger: true,
      actions: true,
      triggerConditions: true,
      disabledAt: true,
    },
  });

  return NextResponse.json(workflow);
});
