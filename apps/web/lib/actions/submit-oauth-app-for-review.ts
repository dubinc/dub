"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "emails";
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
    const { workspace } = ctx;
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

    await sendEmail({
      subject: `New OAuth App Submission: ${integration.name} by ${workspace.name}`,
      email: "steven@dub.co",
      react: message,
    });

    return { ok: true };
  });
