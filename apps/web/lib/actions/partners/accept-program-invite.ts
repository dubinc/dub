"use server";

import { generateDiscountCodeForPartner } from "@/lib/api/discounts/generate-discount-code-for-partner";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { triggerDraftBountySubmissionCreation } from "@/lib/bounty/api/trigger-draft-bounty-submissions";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const acceptProgramInviteSchema = z.object({
  programId: z.string(),
});

export const acceptProgramInviteAction = authPartnerActionClient
  .inputSchema(acceptProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programId } = parsedInput;

    const enrollment = await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
        status: "invited",
      },
      data: {
        status: "approved",
        createdAt: new Date(),
      },
      include: {
        links: true,
      },
    });

    // TODO: Move these into a workflow similar to `/api/workflows/partner-approved/route.ts`
    waitUntil(
      (async () => {
        const workspace = await prisma.project.findUnique({
          where: {
            defaultProgramId: programId,
          },
        });

        if (!workspace) {
          console.log("No workspace found for program", programId);
          return;
        }

        const enrolledPartner = EnrolledPartnerSchema.parse({
          ...partner,
          ...enrollment,
          id: partner.id,
        });

        await Promise.allSettled([
          // 1. Generate discount code for partner (if enabled)
          generateDiscountCodeForPartner({
            workspaceId: workspace.id,
            partner: enrolledPartner,
          }),
          // 2. Send "partner.enrolled" webhook to workspace
          sendWorkspaceWebhook({
            workspace,
            trigger: "partner.enrolled",
            data: enrolledPartner,
          }),
          // 3. Trigger draft bounty submission creation
          triggerDraftBountySubmissionCreation({
            programId,
            partnerIds: [enrolledPartner.id],
          }),
          // 4. Execute Dub workflows using the “partnerEnrolled” trigger.
          executeWorkflows({
            trigger: "partnerEnrolled",
            identity: {
              workspaceId: workspace.id,
              programId,
              partnerId: enrolledPartner.id,
            },
          }),
        ]);
      })(),
    );
  });
