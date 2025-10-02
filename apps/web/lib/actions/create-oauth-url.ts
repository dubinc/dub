"use server";

import z from "zod";
import { verifyFolderAccess } from "../folder/permissions";
import { bitlyOAuthProvider } from "../integrations/bitly/oauth";
import { authActionClient } from "./safe-action";

const schema = z.object({
  provider: z.literal("bitly"),
  workspaceId: z.string(),
  folderId: z.string().optional(),
});

// Generate the OAuth sigin URL based on the provider
export const createOAuthUrl = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { provider, folderId } = parsedInput;

    if (folderId) {
      await verifyFolderAccess({
        workspace,
        userId: user.id,
        folderId,
        requiredPermission: "folders.links.write",
      });
    }

    if (provider === "bitly") {
      return {
        url: await bitlyOAuthProvider.generateAuthUrl({
          workspaceId: workspace.id,
          ...(folderId ? { folderId } : {}),
        }),
      };
    }
  });
