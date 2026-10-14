import { getCampaignOrThrow } from "@/lib/api/campaigns/get-campaign-or-throw";
import { renderCampaignEmailHTML } from "@/lib/api/campaigns/render-campaign-email-html";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  parseCampaignFromAddress,
  resolveCampaignFromAddress,
} from "@/lib/email/parse-campaign-from-address";
import { TiptapNode } from "@/lib/types";
import {
  campaignFromSchema,
  CampaignSchema,
  EMAIL_TEMPLATE_VARIABLE_INFO,
  EMAIL_TEMPLATE_VARIABLES,
} from "@/lib/zod/schemas/campaigns";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const sendPreviewEmailSchema = CampaignSchema.pick({
  subject: true,
  preview: true,
  bodyJson: true,
}).extend({
  from: campaignFromSchema.optional(),
  emailAddresses: z
    .array(z.email())
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
        include: {
          emailDomains: {
            where: {
              status: "verified",
            },
          },
        },
      }),

      getCampaignOrThrow({
        programId,
        campaignId,
      }),
    ]);

    // check if from email is a valid email domain
    if (from) {
      const parsed = parseCampaignFromAddress(from);
      const domainPart = parsed?.email.split("@")[1];

      if (
        !parsed ||
        !program.emailDomains.some(
          ({ slug: emailDomain }) => domainPart === emailDomain,
        )
      ) {
        throw new DubApiError({
          code: "bad_request",
          message: "Invalid domain. You can only send from a verified domain.",
        });
      }
    }

    const { data, error } = await sendBatchEmail(
      emailAddresses.map((email) => ({
        variant: campaign.type === "marketing" ? "marketing" : "notifications",
        to: email,
        ...(from && {
          from: resolveCampaignFromAddress({
            from,
            programName: program.name,
          }),
        }),
        ...(program.supportEmail ? { replyTo: program.supportEmail } : {}),
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
              variables: Object.fromEntries(
                EMAIL_TEMPLATE_VARIABLES.map((key) => [
                  key,
                  EMAIL_TEMPLATE_VARIABLE_INFO[key].example,
                ]),
              ),
            }),
          },
        }),
      })),
    );
    console.log("Resend response:", data);

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
    requiredRoles: ["owner", "member"],
  },
);
