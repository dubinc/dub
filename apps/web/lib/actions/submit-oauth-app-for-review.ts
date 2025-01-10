"use server";

import { plain, upsertPlainCustomer } from "@/lib/plain";
import { prisma } from "@dub/prisma";
import { ComponentDividerSpacingSize } from "@team-plain/typescript-sdk";
import { ratelimit } from "../upstash";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  message: z.string().max(1000),
  workspaceId: z.string(),
  integrationId: z.string(),
});

// Submit an OAuth app for review
export const submitOAuthAppForReview = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { user, workspace } = ctx;
    const { message, integrationId } = parsedInput;

    const integration = await prisma.integration.findFirstOrThrow({
      where: {
        id: integrationId,
        projectId: workspace.id,
      },
    });

    const { success } = await ratelimit(1, "1 m").limit(
      `submit-oauth-app-for-review:${integrationId}`,
    );

    if (!success) {
      throw new Error(
        "Rate limit exceeded. Please try again later or contact support.",
      );
    }

    let plainCustomerId: string | null = null;

    const plainCustomer = await plain.getCustomerByEmail({
      email: user.email,
    });

    if (plainCustomer.data) {
      plainCustomerId = plainCustomer.data.id;
    } else {
      const { data } = await upsertPlainCustomer(user);
      if (data) {
        plainCustomerId = data.customer.id;
      }
    }

    await plain.createThread({
      customerIdentifier: {
        customerId: plainCustomerId,
      },
      title: `Integration Submission: ${integration.name}`,
      components: [
        {
          componentText: {
            text: message,
          },
        },
        {
          componentDivider: {
            dividerSpacingSize: ComponentDividerSpacingSize.L,
          },
        },
        {
          componentRow: {
            rowMainContent: [
              {
                componentText: {
                  text: "Integration Slug",
                },
              },
            ],
            rowAsideContent: [
              {
                componentText: {
                  text: integration.slug,
                },
              },
            ],
          },
        },
        {
          componentRow: {
            rowMainContent: [
              {
                componentText: {
                  text: "Workspace Slug",
                },
              },
            ],
            rowAsideContent: [
              {
                componentText: {
                  text: workspace.slug,
                },
              },
            ],
          },
        },
      ],
    });

    return { ok: true };
  });
