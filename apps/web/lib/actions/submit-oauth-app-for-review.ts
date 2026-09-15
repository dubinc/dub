"use server";

import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { ComponentDividerSpacingSize } from "@team-plain/typescript-sdk";
import * as z from "zod/v4";
import { createPlainThread } from "../plain/create-plain-thread";
import { authActionClient } from "./safe-action";
import { throwIfNoPermission } from "./throw-if-no-permission";

const schema = z.object({
  message: z.string().max(1000),
  workspaceId: z.string(),
  integrationId: z.string(),
});

// Submit an OAuth app for review
export const submitOAuthAppForReview = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { user, workspace } = ctx;
    const { message, integrationId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["oauth_apps.write"],
    });

    const integration = await prisma.integration.findFirstOrThrow({
      where: {
        id: integrationId,
        projectId: workspace.id,
      },
    });

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.oauthAppReviewSubmit,
      identifier: integrationId,
    });

    await createPlainThread({
      user,
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
