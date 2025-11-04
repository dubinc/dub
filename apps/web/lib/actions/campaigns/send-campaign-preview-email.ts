"use server";

import { getCampaignOrThrow } from "@/lib/api/campaigns/get-campaign-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { renderCampaignEmailHTML } from "@/lib/api/workflows/render-campaign-email-html";
import { TiptapNode } from "@/lib/types";
import { CampaignSchema } from "@/lib/zod/schemas/campaigns";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const sendPreviewEmailSchema = z
  .object({
    campaignId: z.string(),
    workspaceId: z.string(),
    subject: z.string().min(1, "Email subject is required."),
    from: z.string().email().optional(),
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
    const { campaignId, subject, from, bodyJson, emailAddresses } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [program, campaign] = await Promise.all([
      getProgramOrThrow({
        programId,
        workspaceId: workspace.id,
      }),

      getCampaignOrThrow({
        programId,
        campaignId,
      }),
    ]);

    const variant =
      campaign.type === "marketing" ? "marketing" : "notifications";

    const { error } = await sendBatchEmail(
      emailAddresses.map((email) => ({
        variant,
        to: email,
        ...(from && { from: `${program.name} <${from}>` }),
        subject: `[TEST] ${subject}`,
        react: CampaignEmail({
          program: {
            name: program.name,
            slug: program.slug,
            logo: program.logo,
            messagingEnabledAt: program.messagingEnabledAt,
          },
          campaign: {
            type: campaign.type,
            subject,
            body: renderCampaignEmailHTML({
              content: bodyJson as unknown as TiptapNode,
              variables: {
                PartnerName: "Partner",
                PartnerEmail: "partner@acme.com",
              },
            }),
          },
        }),
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  });
