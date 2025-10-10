"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { renderEmailTemplate } from "@/lib/api/workflows/render-email-template";
import { CampaignSchema } from "@/lib/zod/schemas/campaigns";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { prisma } from "@dub/prisma";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
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
        Image,
        Mention.extend({
          renderHTML({ node }: { node: any }) {
            return [
              "span",
              {
                class:
                  "px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold",
                "data-type": "mention",
                "data-id": node.attrs.id,
              },
              `{{${node.attrs.id}}}`,
            ];
          },
          renderText({ node }: { node: any }) {
            return `{{${node.attrs.id}}}`;
          },
        }).configure({
          suggestion: {
            items: ({ query }: { query: string }) => {
              const variables = ["PartnerName", "PartnerEmail"];
              return variables
                .filter((item) =>
                  item.toLowerCase().startsWith(query.toLowerCase()),
                )
                .slice(0, 5);
            },
          },
        }),
      ]),
      variables: {
        PartnerName: "Partner",
        PartnerEmail: "partner@acme.com",
      },
    });

    const response = await sendBatchEmail(
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

    console.log(JSON.stringify(response, null, 2));
  });
