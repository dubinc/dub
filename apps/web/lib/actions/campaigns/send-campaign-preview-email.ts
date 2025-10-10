"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { CampaignSchema } from "@/lib/zod/schemas/campaigns";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const sendPreviewEmailSchema = z
  .object({
    campaignId: z.string(),
    workspaceId: z.string(),
    subject: z.string().min(1, "Email subject is required."),
    emailAddresses: z
      .array(z.string().email())
      .min(1)
      .max(10, "Maximum 10 email addresses allowed."),
  })
  .merge(
    CampaignSchema.pick({
      bodyJson: true,
    }),
  );

export const sendCampaignPreviewEmail = authActionClient
  .schema(sendPreviewEmailSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { campaignId, subject, bodyJson, emailAddresses } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.campaign.findUniqueOrThrow({
      where: {
        id: campaignId,
        programId,
      },
    });

    await sendBatchEmail(
      emailAddresses.map((email) => ({
        variant: "notifications",
        to: email,
        subject: `[TEST] ${subject}`,
        react: CampaignEmail({
          campaign: {
            subject,
            bodyJson,
          },
        }),
      })),
    );
  });
