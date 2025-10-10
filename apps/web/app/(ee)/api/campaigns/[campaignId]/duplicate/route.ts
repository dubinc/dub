import { DEFAULT_CAMPAIGN_BODY } from "@/lib/api/campaigns";
import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseWorkflowConfig } from "@/lib/api/workflows/parse-workflow-config";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { CampaignStatus } from "@prisma/client";
import { NextResponse } from "next/server";

// POST /api/campaigns/[campaignId]/duplicate - duplicate an existing campaign
export const POST = withWorkspace(
  async ({ workspace, session, params }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: {
        id: campaignId,
        programId,
      },
      include: {
        workflow: true,
      },
    });

    const duplicatedCampaign = await prisma.$transaction(async (tx) => {
      let workflowId: string | null = null;
      const campaignId = createId({ prefix: "cmp_" });

      if (campaign.workflow) {
        const { action, condition } = parseWorkflowConfig(campaign.workflow);

        const newWorkflow = await tx.workflow.create({
          data: {
            id: createId({ prefix: "wf_" }),
            programId,
            name: campaign.name,
            trigger: campaign.workflow.trigger,
            triggerConditions: [condition],
            actions: [
              {
                ...action,
                data: {
                  ...action.data,
                  campaignId,
                },
              },
            ],
          },
        });

        workflowId = newWorkflow.id;
      }

      return await tx.campaign.create({
        data: {
          id: campaignId,
          programId,
          workflowId,
          userId: session.user.id,
          status: CampaignStatus.draft,
          name: `${campaign.name} (copy)`,
          subject: campaign.subject,
          body: "",
          bodyJson: campaign.bodyJson ?? DEFAULT_CAMPAIGN_BODY,
          type: campaign.type,
        },
      });
    });

    return NextResponse.json({ id: duplicatedCampaign.id });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    featureFlag: "emailCampaigns",
  },
);
