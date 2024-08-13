"use server";

import { prisma } from "@/lib/prisma";
import { OAUTH_CONFIG } from "../api/oauth/constants";
import { createToken } from "../api/oauth/utils";
import { hashToken } from "../auth";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  appId: z.string(),
});

// Generate a new client secret for an integration
export const generateClientSecret = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { appId } = parsedInput;

    await prisma.integration.findFirstOrThrow({
      where: {
        id: appId,
        projectId: workspace.id,
      },
    });

    const clientSecret = createToken({
      length: OAUTH_CONFIG.CLIENT_SECRET_LENGTH,
      prefix: OAUTH_CONFIG.CLIENT_SECRET_PREFIX,
    });

    await prisma.oAuthApp.update({
      where: {
        integrationId: appId,
      },
      data: {
        hashedClientSecret: await hashToken(clientSecret),
        partialClientSecret: `dub_app_secret_****${clientSecret.slice(-8)}`,
      },
    });

    return { clientSecret };
  });
