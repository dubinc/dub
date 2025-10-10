"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { renderEmailTemplate } from "@/lib/api/workflows/render-email-template";
import { CampaignSchema } from "@/lib/zod/schemas/campaigns";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { prisma } from "@dub/prisma";
import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
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

    const bodyHtml = renderEmailTemplate({
      template: generateHTML(bodyJson, [
        StarterKit.configure({
          heading: {
            levels: [1, 2],
          },
        }),
      ]),
      variables: {
        PartnerName: "Partner",
        PartnerEmail: "partner@acme.com",
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
            body: bodyHtml,
          },
        }),
      })),
    );
  });
