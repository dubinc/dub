import { getCampaignOrThrow } from "@/lib/api/campaigns/get-campaign-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { renderCampaignEmailHTML } from "@/lib/api/workflows/render-campaign-email-html";
import { withWorkspace } from "@/lib/auth";
import { TiptapNode } from "@/lib/types";
import { CampaignSchema } from "@/lib/zod/schemas/campaigns";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { NextResponse } from "next/server";
import { z } from "zod";

const sendPreviewEmailSchema = CampaignSchema.pick({
  subject: true,
  preview: true,
  bodyJson: true,
}).extend({
  from: z.string().email().optional(),
  emailAddresses: z
    .array(z.string().email())
    .min(1)
    .max(10, "Maximum 10 email addresses allowed."),
});

// POST /api/campaigns/[campaignId]/preview - send preview email for a campaign
export const POST = withWorkspace(
  async ({ workspace, params, req }) => {
    const { campaignId } = params;

    const { subject, preview, from, bodyJson, emailAddresses } =
      sendPreviewEmailSchema.parse(await parseRequestBody(req));

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

    const { error } = await sendBatchEmail(
      emailAddresses.map((email) => ({
        variant: campaign.type === "marketing" ? "marketing" : "notifications",
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
            preview,
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
      throw new DubApiError({
        code: "bad_request",
        message: error.message,
      });
    }

    return NextResponse.json({ success: true });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
